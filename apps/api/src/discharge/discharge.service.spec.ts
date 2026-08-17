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
    findOne: jest.fn().mockResolvedValue({
      id: 'patient-1',
      hospitalId: 'hospital-a',
    }),
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

    it('rejects scheduled follow-up when no doctor is provided or attending', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'adm-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'active',
          bedId: null,
          attendingDoctorId: null,
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.findOne
        .mockResolvedValueOnce(null) // no existing discharge
        .mockResolvedValueOnce({ id: 'patient-1', hospitalId: 'hospital-a' });
      manager.save.mockImplementation((entity: Record<string, unknown>) =>
        Promise.resolve({ id: 'discharge-1', ...entity }),
      );

      await expect(
        service.createDischarge(
          'hospital-a',
          {
            admissionId: 'adm-1',
            summary: 'Recovered',
            followUpScheduledAt: '2026-08-20T10:00:00.000Z',
          },
          actor,
        ),
      ).rejects.toThrow(
        'Follow-up doctor is required when scheduling a follow-up',
      );
    });
  });

  describe('createFollowUp', () => {
    it('rejects missing doctorId', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-a',
      });

      await expect(
        service.createFollowUp(
          'hospital-a',
          {
            patientId: 'patient-1',
            doctorId: '',
            scheduledAt: '2026-08-20T10:00:00.000Z',
          },
          actor,
        ),
      ).rejects.toThrow('Follow-up doctor is required');
    });
  });

  describe('updateFollowUpStatus', () => {
    it('advances scheduled → completed under a row lock', async () => {
      const row = {
        id: 'fu-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
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
          patientId: 'patient-1',
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

    it('rejects marking rescheduled without a new date', async () => {
      const row = {
        id: 'fu-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'scheduled',
      };
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(row),
      };
      followManager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateFollowUpStatus(
          'hospital-a',
          { id: 'fu-1', status: 'rescheduled' },
          actor,
        ),
      ).rejects.toThrow(/Use rescheduleFollowUp/);
    });
  });

  describe('rescheduleFollowUp', () => {
    const mockLockedFollowUp = (row: Record<string, unknown>) => {
      const state = { ...row };
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(state),
      };
      followManager.createQueryBuilder.mockReturnValue(qb);
      followManager.save.mockImplementation((r: typeof state) => {
        Object.assign(state, r);
        return Promise.resolve(state);
      });
      followManager.findOne.mockResolvedValue({
        id: state.patientId ?? 'patient-1',
        hospitalId: 'hospital-a',
      });
      followUpsRepo.findOne.mockImplementation(() =>
        Promise.resolve({ ...state, patient: null, doctor: null }),
      );
      return state;
    };

    it('updates due date and keeps status scheduled', async () => {
      mockLockedFollowUp({
        id: 'fu-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'scheduled',
        scheduledAt: new Date('2026-08-18T10:00:00.000Z'),
      });

      const result = await service.rescheduleFollowUp(
        'hospital-a',
        { id: 'fu-1', scheduledAt: '2026-08-25T09:30:00.000Z' },
        actor,
      );

      expect(result.status).toBe('scheduled');
      expect(new Date(result.scheduledAt).toISOString()).toBe(
        '2026-08-25T09:30:00.000Z',
      );
    });

    it('revives a dead rescheduled row with a new live date', async () => {
      mockLockedFollowUp({
        id: 'fu-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'rescheduled',
        scheduledAt: new Date('2026-08-18T10:00:00.000Z'),
      });

      const result = await service.rescheduleFollowUp(
        'hospital-a',
        {
          id: 'fu-1',
          scheduledAt: '2026-08-26T15:00:00.000Z',
          notes: 'Moved at patient request',
        },
        actor,
      );

      expect(result.status).toBe('scheduled');
      expect(result.notes).toBe('Moved at patient request');
    });

    it('rejects completed follow-ups', async () => {
      mockLockedFollowUp({
        id: 'fu-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'completed',
      });

      await expect(
        service.rescheduleFollowUp(
          'hospital-a',
          { id: 'fu-1', scheduledAt: '2026-08-25T09:30:00.000Z' },
          actor,
        ),
      ).rejects.toThrow(/Cannot reschedule a completed follow-up/);
    });
  });
});
