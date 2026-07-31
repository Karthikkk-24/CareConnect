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

  const appointmentsRepo = {
    findOne: jest.fn(),
    save: jest.fn((a: Appointment) => Promise.resolve(a)),
    find: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  it('allows scheduled → checked_in', async () => {
    appointmentsRepo.findOne.mockResolvedValue({
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
    appointmentsRepo.findOne.mockResolvedValue({
      id: 'appt-1',
      hospitalId: 'hospital-a',
      status: 'completed',
    });
    await expect(
      service.updateStatus('appt-1', 'scheduled', 'hospital-a', actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects cancelling a completed appointment', async () => {
    appointmentsRepo.findOne.mockResolvedValue({
      id: 'appt-1',
      hospitalId: 'hospital-a',
      status: 'completed',
    });
    await expect(
      service.cancel('hospital-a', { id: 'appt-1' }, actor),
    ).rejects.toThrow(/Cannot transition/);
  });

  it('throws NotFound when appointment missing', async () => {
    appointmentsRepo.findOne.mockResolvedValue(null);
    await expect(
      service.updateStatus('missing', 'checked_in', 'hospital-a', actor),
    ).rejects.toThrow(NotFoundException);
  });
});
