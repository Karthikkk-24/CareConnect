import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Appointment, Department, Patient } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { HospitalDoctorValidator } from '../common/hospital-doctor.validator';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService status machine', () => {
  let service: AppointmentsService;

  const apptManager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const appointmentsRepo = {
    findOne: jest.fn(),
    save: jest.fn((a: Appointment) => Promise.resolve(a)),
    find: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: typeof apptManager) => unknown) =>
        Promise.resolve(cb(apptManager)),
      ),
    },
  };
  const patientsRepo = { findOne: jest.fn() };
  const departmentsRepo = { findOne: jest.fn() };
  const audit = { log: jest.fn() };
  const doctorValidator = {
    assertHospitalDoctor: jest.fn().mockResolvedValue(undefined),
  };

  const actor: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'r@h.com',
    fullName: 'Reception',
    hospitalId: 'hospital-a',
    roles: ['receptionist'],
    permissions: ['appointments:write'],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    appointmentsRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof apptManager) => unknown) =>
        Promise.resolve(cb(apptManager)),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentsRepo,
        },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: getRepositoryToken(Department), useValue: departmentsRepo },
        { provide: AuditService, useValue: audit },
        { provide: HospitalDoctorValidator, useValue: doctorValidator },
      ],
    }).compile();
    service = module.get(AppointmentsService);
  });

  const mockLockedAppointment = (row: Record<string, unknown>) => {
    const state = { ...row };
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(state),
    };
    apptManager.createQueryBuilder.mockReturnValue(qb);
    apptManager.save.mockImplementation((a: typeof state) => {
      Object.assign(state, a);
      return Promise.resolve(state);
    });
    apptManager.findOne.mockResolvedValue({
      id: state.patientId ?? 'patient-1',
      hospitalId: 'hospital-a',
      status: 'registered',
    });
    const fetchQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => Promise.resolve({ ...state })),
    };
    appointmentsRepo.createQueryBuilder.mockReturnValue(fetchQb);
    appointmentsRepo.findOne.mockImplementation(() =>
      Promise.resolve({ ...state }),
    );
    return qb;
  };

  it('allows scheduled → checked_in', async () => {
    mockLockedAppointment({
      id: 'appt-1',
      hospitalId: 'hospital-a',
      patientId: 'patient-1',
      status: 'scheduled',
    });
    apptManager.findOne.mockResolvedValue({
      id: 'patient-1',
      hospitalId: 'hospital-a',
      status: 'registered',
    });
    const result = await service.updateStatus(
      'appt-1',
      'checked_in',
      'hospital-a',
      actor,
    );
    expect(result.status).toBe('checked_in');
    expect(apptManager.save).toHaveBeenCalled();
  });

  it('rejects completed → scheduled', async () => {
    mockLockedAppointment({
      id: 'appt-1',
      hospitalId: 'hospital-a',
      status: 'completed',
    });
    await expect(
      service.updateStatus('appt-1', 'scheduled', 'hospital-a', actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects cancelling a completed appointment', async () => {
    mockLockedAppointment({
      id: 'appt-1',
      hospitalId: 'hospital-a',
      status: 'completed',
    });
    await expect(
      service.cancel('hospital-a', { id: 'appt-1' }, actor),
    ).rejects.toThrow(/Cannot transition/);
  });

  it('throws NotFound when appointment missing', async () => {
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    apptManager.createQueryBuilder.mockReturnValue(qb);
    await expect(
      service.updateStatus('missing', 'checked_in', 'hospital-a', actor),
    ).rejects.toThrow(NotFoundException);
  });

  describe('doctor appointment scoping', () => {
    const listQb = () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      appointmentsRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('forces doctorId for doctor-only actors', async () => {
      const qb = listQb();
      const doctor: AuthenticatedUser = {
        ...actor,
        id: 'doc-9',
        roles: ['doctor'],
        permissions: ['appointments:read'],
      };

      await service.findAll(
        'hospital-a',
        undefined,
        undefined,
        undefined,
        doctor,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'appointment.doctor_id = :doctorId',
        { doctorId: 'doc-9' },
      );
    });

    it('keeps hospital-wide list for receptionists', async () => {
      const qb = listQb();

      await service.findAll(
        'hospital-a',
        undefined,
        undefined,
        undefined,
        actor,
      );

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'appointment.doctor_id = :doctorId',
        expect.anything(),
      );
    });
  });

  describe('countAppointmentsToday', () => {
    it('joins patients and excludes soft-deleted rows', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      appointmentsRepo.createQueryBuilder.mockReturnValue(qb);

      const count = await service.countAppointmentsToday('hospital-a');

      expect(count).toBe(3);
      expect(qb.innerJoin).toHaveBeenCalledWith('a.patient', 'patient');
      expect(qb.andWhere).toHaveBeenCalledWith('patient.deleted_at IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'a.status NOT IN (:...excluded)',
        { excluded: ['cancelled'] },
      );
    });
  });

  describe('reschedule', () => {
    it('updates scheduledAt and keeps scheduled status', async () => {
      mockLockedAppointment({
        id: 'appt-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'scheduled',
        scheduledAt: new Date('2026-08-18T09:00:00.000Z'),
      });

      const result = await service.reschedule(
        'hospital-a',
        { id: 'appt-1', scheduledAt: '2026-08-21T14:00:00.000Z' },
        actor,
      );

      expect(result.status).toBe('scheduled');
      expect(new Date(result.scheduledAt).toISOString()).toBe(
        '2026-08-21T14:00:00.000Z',
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'reschedule',
          resource: 'appointment',
        }),
      );
    });

    it('revives no_show to scheduled at the new time', async () => {
      mockLockedAppointment({
        id: 'appt-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'no_show',
        scheduledAt: new Date('2026-08-17T09:00:00.000Z'),
      });

      const result = await service.reschedule(
        'hospital-a',
        {
          id: 'appt-1',
          scheduledAt: '2026-08-22T11:00:00.000Z',
          notes: 'Patient called back',
        },
        actor,
      );

      expect(result.status).toBe('scheduled');
      expect(result.notes).toBe('Patient called back');
    });

    it('rejects cancelled appointments', async () => {
      mockLockedAppointment({
        id: 'appt-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'cancelled',
      });

      await expect(
        service.reschedule(
          'hospital-a',
          { id: 'appt-1', scheduledAt: '2026-08-21T14:00:00.000Z' },
          actor,
        ),
      ).rejects.toThrow(/Cannot reschedule a cancelled appointment/);
    });

    it('rejects completed appointments', async () => {
      mockLockedAppointment({
        id: 'appt-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-1',
        status: 'completed',
      });

      await expect(
        service.reschedule(
          'hospital-a',
          { id: 'appt-1', scheduledAt: '2026-08-21T14:00:00.000Z' },
          actor,
        ),
      ).rejects.toThrow(/Cannot reschedule a completed appointment/);
    });

    it('throws NotFound when appointment is missing', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      apptManager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.reschedule(
          'hospital-a',
          { id: 'missing', scheduledAt: '2026-08-21T14:00:00.000Z' },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
