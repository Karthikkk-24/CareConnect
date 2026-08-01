import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
  };
  const prescriptionItemsRepo = { save: jest.fn(), create: jest.fn() };
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
      labOrdersRepo.findOne.mockResolvedValue(order);
      labOrdersRepo.save.mockImplementation((row: typeof order) =>
        Promise.resolve(row),
      );

      const result = await service.updateLabOrderStatus(
        'hospital-a',
        { labOrderId: 'lab-1', status: 'collected' },
        actor,
      );
      expect(result.status).toBe('collected');
    });

    it('rejects completing via updateLabOrderStatus', async () => {
      labOrdersRepo.findOne.mockResolvedValue({
        id: 'lab-1',
        hospitalId: 'hospital-a',
        status: 'ordered',
      });

      await expect(
        service.updateLabOrderStatus(
          'hospital-a',
          { labOrderId: 'lab-1', status: 'completed' },
          actor,
        ),
      ).rejects.toThrow('Use completeLabResult');
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
      prescriptionsRepo.findOne.mockResolvedValue(rx);
      prescriptionsRepo.save.mockImplementation((row: typeof rx) =>
        Promise.resolve(row),
      );

      const result = await service.cancelPrescription(
        'hospital-a',
        { prescriptionId: 'rx-1' },
        actor,
      );
      expect(result.status).toBe('cancelled');
    });

    it('rejects cancelling a dispensed prescription', async () => {
      prescriptionsRepo.findOne.mockResolvedValue({
        id: 'rx-1',
        hospitalId: 'hospital-a',
        status: 'dispensed',
        items: [],
      });

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
