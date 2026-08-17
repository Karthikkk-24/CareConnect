import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Admission, Bed, Patient, Ward } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { HospitalDoctorValidator } from '../common/hospital-doctor.validator';
import { DischargeService } from '../discharge/discharge.service';
import { AdmissionsService } from './admissions.service';

describe('AdmissionsService', () => {
  let service: AdmissionsService;

  const manager = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => data),
  };

  const admissionsRepo = {
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const patientsRepo = { findOne: jest.fn(), save: jest.fn() };
  const wardsRepo = { findOne: jest.fn(), find: jest.fn() };
  const bedsRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
  const audit = { log: jest.fn() };
  const dischargeService = { createDischarge: jest.fn() };
  const doctorValidator = {
    assertHospitalDoctor: jest.fn().mockResolvedValue(undefined),
  };

  const actor: AuthenticatedUser = {
    id: 'admin-1',
    authId: 'auth-1',
    email: 'admin@h.com',
    fullName: 'Admin',
    hospitalId: 'hospital-a',
    roles: ['hospital_admin'],
    permissions: [],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionsService,
        { provide: getRepositoryToken(Admission), useValue: admissionsRepo },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: getRepositoryToken(Ward), useValue: wardsRepo },
        { provide: getRepositoryToken(Bed), useValue: bedsRepo },
        { provide: AuditService, useValue: audit },
        { provide: DischargeService, useValue: dischargeService },
        { provide: HospitalDoctorValidator, useValue: doctorValidator },
      ],
    }).compile();

    service = module.get(AdmissionsService);
  });

  describe('admitPatient concurrency guards', () => {
    const patientQb = (patient: Record<string, unknown> | null) => ({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(patient),
    });

    const bedQb = (bed: Record<string, unknown>) => ({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(bed),
    });

    it('rejects when bed is already occupied after lock', async () => {
      const lockedPatient = patientQb({
        id: 'patient-1',
        hospitalId: 'hospital-a',
        status: 'registered',
      });
      const lockedBed = bedQb({
        id: 'bed-1',
        status: 'occupied',
        hospitalId: 'hospital-a',
        wardId: 'ward-1',
      });
      manager.createQueryBuilder
        .mockReturnValueOnce(lockedPatient)
        .mockReturnValueOnce(lockedBed);
      manager.findOne.mockResolvedValueOnce({
        id: 'ward-1',
        hospitalId: 'hospital-a',
      });

      await expect(
        service.admitPatient(
          'hospital-a',
          {
            patientId: 'patient-1',
            wardId: 'ward-1',
            bedId: 'bed-1',
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(lockedPatient.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(lockedBed.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('rejects when patient already has an active admission', async () => {
      const lockedPatient = patientQb({
        id: 'patient-1',
        hospitalId: 'hospital-a',
        status: 'registered',
      });
      const lockedBed = bedQb({
        id: 'bed-1',
        status: 'available',
        hospitalId: 'hospital-a',
        wardId: 'ward-1',
      });
      manager.createQueryBuilder
        .mockReturnValueOnce(lockedPatient)
        .mockReturnValueOnce(lockedBed);
      manager.findOne
        .mockResolvedValueOnce({ id: 'ward-1', hospitalId: 'hospital-a' })
        .mockResolvedValueOnce({ id: 'adm-existing', status: 'active' });

      await expect(
        service.admitPatient(
          'hospital-a',
          {
            patientId: 'patient-1',
            wardId: 'ward-1',
            bedId: 'bed-1',
          },
          actor,
        ),
      ).rejects.toThrow('Patient already has an active admission');
      expect(lockedPatient.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('throws NotFound when patient missing or soft-deleted', async () => {
      const lockedPatient = patientQb(null);
      manager.createQueryBuilder.mockReturnValueOnce(lockedPatient);
      await expect(
        service.admitPatient(
          'hospital-a',
          {
            patientId: 'missing',
            wardId: 'ward-1',
            bedId: 'bed-1',
          },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(lockedPatient.setLock).toHaveBeenCalledWith('pessimistic_write');
    });
  });

  describe('transferOutAdmission', () => {
    it('marks active admission as transferred and frees bed', async () => {
      const admission = {
        id: 'adm-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        bedId: 'bed-1',
        status: 'active',
        reason: 'fever',
      };
      const bed = { id: 'bed-1', hospitalId: 'hospital-a', status: 'occupied' };
      const patient = {
        id: 'patient-1',
        hospitalId: 'hospital-a',
        status: 'admitted',
      };

      const admissionQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(admission),
      };
      const bedQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(bed),
      };
      manager.createQueryBuilder
        .mockReturnValueOnce(admissionQb)
        .mockReturnValueOnce(bedQb);
      manager.findOne.mockResolvedValue(patient);
      manager.save.mockImplementation((row: unknown) => Promise.resolve(row));

      admissionsRepo.findOne.mockResolvedValue({
        ...admission,
        status: 'transferred',
        patient,
      });

      const result = await service.transferOutAdmission(
        'hospital-a',
        { admissionId: 'adm-1', notes: 'to City Hospital' },
        actor,
      );
      expect(result.status).toBe('transferred');
      expect(bed.status).toBe('available');
      expect(patient.status).toBe('discharged');
    });

    it('rejects transfer-out of discharged admission', async () => {
      const admissionQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'adm-1',
          status: 'discharged',
          patientId: 'patient-1',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(admissionQb);
      manager.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-a',
      });

      await expect(
        service.transferOutAdmission(
          'hospital-a',
          { admissionId: 'adm-1' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transfer-out when patient is soft-deleted', async () => {
      const admissionQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'adm-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          bedId: 'bed-1',
          status: 'active',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(admissionQb);
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.transferOutAdmission(
          'hospital-a',
          { admissionId: 'adm-1' },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('transferAdmission soft-delete', () => {
    it('rejects bed transfer when patient is soft-deleted', async () => {
      const admissionQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'adm-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          bedId: 'bed-1',
          status: 'active',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(admissionQb);
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.transferAdmission(
          'hospital-a',
          {
            admissionId: 'adm-1',
            wardId: 'ward-2',
            bedId: 'bed-2',
          },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('activeAdmissions', () => {
    it('excludes soft-deleted patients via deleted_at filter', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      admissionsRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service.activeAdmissions('hospital-a');

      expect(admissionsRepo.createQueryBuilder).toHaveBeenCalledWith(
        'admission',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('patient.deleted_at IS NULL');
    });
  });
});
