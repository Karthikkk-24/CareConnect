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
  };
  const prescriptionItemsRepo = { save: jest.fn(), create: jest.fn() };
  const labOrdersRepo = {
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const labResultsRepo = { save: jest.fn(), create: jest.fn() };
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
});
