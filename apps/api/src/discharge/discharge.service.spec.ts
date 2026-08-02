import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Discharge, FollowUp, Patient } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { HospitalDoctorValidator } from '../common/hospital-doctor.validator';
import { DischargeService } from './discharge.service';

describe('DischargeService', () => {
  let service: DischargeService;

  const manager = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
      id: 'discharge-1',
      ...data,
    })),
  };

  const dischargesRepo = {
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const followManager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };
  const followUpsRepo = {
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: typeof followManager) => unknown) =>
        Promise.resolve(cb(followManager)),
      ),
    },
  };
  const patientsRepo = { findOne: jest.fn(), save: jest.fn() };
  const audit = { log: jest.fn() };
  const doctorValidator = {
    assertHospitalDoctor: jest.fn().mockResolvedValue(undefined),
  };

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
    followUpsRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof followManager) => unknown) =>
        Promise.resolve(cb(followManager)),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DischargeService,
        { provide: getRepositoryToken(Discharge), useValue: dischargesRepo },
        { provide: getRepositoryToken(FollowUp), useValue: followUpsRepo },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: AuditService, useValue: audit },
        { provide: HospitalDoctorValidator, useValue: doctorValidator },
      ],
    }).compile();
    service = module.get(DischargeService);
  });

  describe('createDischarge', () => {
    it('rejects duplicate discharge summary for the same admission', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'adm-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'active',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.findOne.mockResolvedValue({ id: 'existing-discharge' });

      await expect(
        service.createDischarge(
          'hospital-a',
          { admissionId: 'adm-1', summary: 'Recovered' },
          actor,
        ),
      ).rejects.toThrow(
        'A discharge summary already exists for this admission',
      );
    });
  });

  describe('updateFollowUpStatus', () => {
    it('advances scheduled → completed under a row lock', async () => {
      const row = {
        id: 'fu-1',
        hospitalId: 'hospital-a',
        status: 'scheduled',
      };
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(row),
      };
      followManager.createQueryBuilder.mockReturnValue(qb);
      followManager.save.mockImplementation((r: typeof row) => {
        Object.assign(row, r);
        return Promise.resolve(row);
      });
      followUpsRepo.findOne.mockImplementation(() =>
        Promise.resolve({ ...row, patient: null, doctor: null }),
      );

      const result = await service.updateFollowUpStatus(
        'hospital-a',
        { id: 'fu-1', status: 'completed' },
        actor,
      );
      expect(result.status).toBe('completed');
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('rejects completed → scheduled', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'fu-1',
          hospitalId: 'hospital-a',
          status: 'completed',
        }),
      };
      followManager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateFollowUpStatus(
          'hospital-a',
          { id: 'fu-1', status: 'scheduled' },
          actor,
        ),
      ).rejects.toThrow(/Cannot transition follow-up/);
    });
  });
});
