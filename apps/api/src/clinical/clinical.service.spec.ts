import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import {
  Admission,
  ClinicalNote,
  Diagnosis,
  LabOrder,
  LabResult,
  Patient,
  Prescription,
  PrescriptionItem,
  VitalSign,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { ClinicalService } from './clinical.service';

describe('ClinicalService', () => {
  let service: ClinicalService;

  const vitalsRepo = { save: jest.fn(), create: jest.fn(), find: jest.fn() };
  const diagnosesRepo = { save: jest.fn(), create: jest.fn(), find: jest.fn() };
  const notesRepo = { save: jest.fn(), create: jest.fn(), find: jest.fn() };
  const prescriptionsRepo = {
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };
  const prescriptionItemsRepo = { save: jest.fn(), create: jest.fn() };
  const rxManager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };
  const labManager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => data),
  };
  const labOrdersRepo = {
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: typeof labManager) => unknown) =>
        Promise.resolve(cb(labManager)),
      ),
    },
  };
  const labResultsRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };
  const patientsRepo = { findOne: jest.fn() };
  const admissionsRepo = { findOne: jest.fn() };
  const audit = { log: jest.fn() };

  const actor: AuthenticatedUser = {
    id: 'doc-1',
    authId: 'auth-1',
    email: 'doc@h.com',
    fullName: 'Doctor',
    hospitalId: 'hospital-a',
    roles: ['doctor'],
    permissions: ['patients:write'],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prescriptionsRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof rxManager) => unknown) => Promise.resolve(cb(rxManager)),
    );
    labOrdersRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof labManager) => unknown) =>
        Promise.resolve(cb(labManager)),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalService,
        { provide: getRepositoryToken(VitalSign), useValue: vitalsRepo },
        { provide: getRepositoryToken(Diagnosis), useValue: diagnosesRepo },
        { provide: getRepositoryToken(ClinicalNote), useValue: notesRepo },
        {
          provide: getRepositoryToken(Prescription),
          useValue: prescriptionsRepo,
        },
        {
          provide: getRepositoryToken(PrescriptionItem),
          useValue: prescriptionItemsRepo,
        },
        { provide: getRepositoryToken(LabOrder), useValue: labOrdersRepo },
        { provide: getRepositoryToken(LabResult), useValue: labResultsRepo },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: getRepositoryToken(Admission), useValue: admissionsRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ClinicalService);
  });

  describe('admission patient binding', () => {
    it('rejects vitals when admission belongs to another patient', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-a',
      });
      admissionsRepo.findOne.mockResolvedValue({
        id: 'adm-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-other',
      });

      await expect(
        service.createVital(
          'hospital-a',
          {
            patientId: 'patient-1',
            admissionId: 'adm-1',
            heartRate: 72,
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createVital(
          'hospital-a',
          {
            patientId: 'patient-1',
            admissionId: 'adm-1',
            heartRate: 72,
          },
          actor,
        ),
      ).rejects.toThrow('Admission does not belong to the given patient');
      expect(vitalsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('lab order status machine', () => {
    it('rejects re-completing a completed lab order', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'lab-1',
          hospitalId: 'hospital-a',
          status: 'completed',
        }),
      };
      labManager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.completeLabResult(
          'hospital-a',
          { labOrderId: 'lab-1', resultValue: '5.0' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(labManager.save).not.toHaveBeenCalled();
    });

    it('maps unique result_file_url violation to ConflictException', async () => {
      const uniqueError = new QueryFailedError('INSERT', [], new Error('dup'));
      (uniqueError as QueryFailedError & { code?: string }).code = '23505';
      labOrdersRepo.manager.transaction.mockRejectedValue(uniqueError);

      await expect(
        service.completeLabResult(
          'hospital-a',
          {
            labOrderId: 'lab-1',
            resultValue: '5.0',
            resultFileUrl: '/uploads/abc.pdf',
          },
          actor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('advances ordered → collected', async () => {
      const order = {
        id: 'lab-1',
        hospitalId: 'hospital-a',
        status: 'ordered',
        patientId: 'p1',
        testName: 'CBC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(order),
      };
      labManager.createQueryBuilder.mockReturnValue(qb);
      labManager.save.mockResolvedValue(order);
      labOrdersRepo.findOne.mockResolvedValue(order);

      const result = await service.updateLabOrderStatus(
        'hospital-a',
        { labOrderId: 'lab-1', status: 'collected' },
        actor,
      );
      expect(result.status).toBe('collected');
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('rejects completing via updateLabOrderStatus', async () => {
      await expect(
        service.updateLabOrderStatus(
          'hospital-a',
          { labOrderId: 'lab-1', status: 'completed' },
          actor,
        ),
      ).rejects.toThrow('Use completeLabResult');
      expect(labOrdersRepo.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('prescription cancel', () => {
    it('cancels a pending prescription', async () => {
      const rx = {
        id: 'rx-1',
        hospitalId: 'hospital-a',
        status: 'pending',
        patientId: 'p1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...rx }),
      };
      rxManager.createQueryBuilder.mockReturnValue(qb);
      rxManager.save.mockImplementation((row: typeof rx) => {
        Object.assign(rx, row);
        return Promise.resolve(rx);
      });
      prescriptionsRepo.findOne.mockImplementation(() =>
        Promise.resolve({ ...rx }),
      );

      const result = await service.cancelPrescription(
        'hospital-a',
        { prescriptionId: 'rx-1' },
        actor,
      );
      expect(result.status).toBe('cancelled');
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('rejects cancelling a dispensed prescription', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          status: 'dispensed',
          items: [],
        }),
      };
      rxManager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.cancelPrescription(
          'hospital-a',
          { prescriptionId: 'rx-1' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
