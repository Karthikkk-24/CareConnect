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
    appointmentsRepo.findOne.mockImplementation(() =>
      Promise.resolve({ ...state }),
    );
    return qb;
  };

  it('allows scheduled → checked_in', async () => {
    mockLockedAppointment({
      id: 'appt-1',
      hospitalId: 'hospital-a',
      status: 'scheduled',
    });
    const result = await service.updateStatus(
      'appt-1',
      'checked_in',
      'hospital-a',
      actor,
    );
    expect(result.status).toBe('checked_in');
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
    it('forces doctorId for doctor-only actors', async () => {
      appointmentsRepo.find.mockResolvedValue([]);
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

      expect(appointmentsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hospitalId: 'hospital-a', doctorId: 'doc-9' },
        }),
      );
    });

    it('keeps hospital-wide list for receptionists', async () => {
      appointmentsRepo.find.mockResolvedValue([]);

      await service.findAll(
        'hospital-a',
        undefined,
        undefined,
        undefined,
        actor,
      );

      expect(appointmentsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hospitalId: 'hospital-a' },
        }),
      );
    });
  });
});
