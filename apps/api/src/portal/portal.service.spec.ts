import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Appointment,
  LabOrder,
  LabResult,
  Patient,
  Prescription,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AppointmentsService } from '../appointments/appointments.service';
import { ClinicalService } from '../clinical/clinical.service';
import { PortalService } from './portal.service';

describe('PortalService', () => {
  let service: PortalService;

  const patientsRepo = { findOne: jest.fn(), find: jest.fn() };
  const appointmentsRepo = { find: jest.fn() };
  const prescriptionsRepo = { find: jest.fn() };
  const labOrdersRepo = { find: jest.fn() };
  const labResultsRepo = { find: jest.fn() };
  const appointmentsService = { toAppointmentType: jest.fn((a) => a) };
  const clinicalService = { toPrescriptionType: jest.fn((p) => p) };

  const actor: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'same@example.com',
    fullName: 'Patient User',
    hospitalId: undefined,
    roles: ['patient'],
    permissions: [],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentsRepo,
        },
        {
          provide: getRepositoryToken(Prescription),
          useValue: prescriptionsRepo,
        },
        { provide: getRepositoryToken(LabOrder), useValue: labOrdersRepo },
        { provide: getRepositoryToken(LabResult), useValue: labResultsRepo },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: ClinicalService, useValue: clinicalService },
      ],
    }).compile();
    service = module.get(PortalService);
  });

  it('does not expose PHI for same email when patient.userId is unset', async () => {
    patientsRepo.findOne.mockResolvedValue(null);

    const result = await service.portalPatientRecords(actor);

    expect(result.patient).toBeUndefined();
    expect(result.appointments).toEqual([]);
    expect(result.prescriptions).toEqual([]);
    expect(result.labResults).toEqual([]);
    expect(patientsRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(patientsRepo.find).not.toHaveBeenCalled();
    expect(appointmentsRepo.find).not.toHaveBeenCalled();
  });

  it('returns records when patient is explicitly linked by userId', async () => {
    patientsRepo.findOne.mockResolvedValue({
      id: 'patient-1',
      hospitalId: 'hospital-a',
      userId: 'user-1',
      fullName: 'Linked',
      email: 'same@example.com',
      status: 'registered',
    });
    appointmentsRepo.find.mockResolvedValue([]);
    prescriptionsRepo.find.mockResolvedValue([]);
    labOrdersRepo.find.mockResolvedValue([]);

    const result = await service.portalPatientRecords(actor);

    expect(result.patient?.id).toBe('patient-1');
    expect(appointmentsRepo.find).toHaveBeenCalled();
  });
});
