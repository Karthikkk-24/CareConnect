import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import {
  Admission,
  Patient,
  PatientAllergy,
  PatientConsent,
  PatientDocument,
  PatientEmergencyContact,
  PatientImportJob,
  PatientInsurance,
  PatientMedicalHistory,
  PatientMedication,
  User,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PatientsService } from './patients.service';

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
  };
});

const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;

describe('PatientsService', () => {
  let service: PatientsService;

  const patientsRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const relatedRepo = {
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const usersRepo = {
    findOne: jest.fn(),
  };

  const admissionsRepo = {
    findOne: jest.fn(),
  };

  const audit = { log: jest.fn() };

  const actor: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'staff@hospital.com',
    fullName: 'Staff',
    hospitalId: 'hospital-1',
    roles: ['hospital_admin'],
    permissions: [],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    relatedRepo.find.mockResolvedValue([]);
    existsSyncMock.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        {
          provide: getRepositoryToken(PatientEmergencyContact),
          useValue: relatedRepo,
        },
        {
          provide: getRepositoryToken(PatientInsurance),
          useValue: relatedRepo,
        },
        { provide: getRepositoryToken(PatientAllergy), useValue: relatedRepo },
        {
          provide: getRepositoryToken(PatientMedication),
          useValue: relatedRepo,
        },
        {
          provide: getRepositoryToken(PatientMedicalHistory),
          useValue: relatedRepo,
        },
        { provide: getRepositoryToken(PatientDocument), useValue: relatedRepo },
        { provide: getRepositoryToken(PatientConsent), useValue: relatedRepo },
        {
          provide: getRepositoryToken(PatientImportJob),
          useValue: relatedRepo,
        },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Admission), useValue: admissionsRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(PatientsService);
  });

  const mockQueryBuilder = (hasDuplicate: boolean) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue(hasDuplicate ? { id: 'existing' } : null),
    };
    patientsRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  describe('deletePatient', () => {
    it('soft deletes the patient and logs audit', async () => {
      const patient = {
        id: 'patient-1',
        hospitalId: 'hospital-1',
        fullName: 'Jane Doe',
      };
      patientsRepo.findOne.mockResolvedValue(patient);
      patientsRepo.softRemove.mockResolvedValue(patient);

      const result = await service.deletePatient(
        'patient-1',
        'hospital-1',
        actor,
      );

      expect(result).toBe(true);
      expect(patientsRepo.softRemove).toHaveBeenCalledWith(patient);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          resource: 'patient',
          resourceId: 'patient-1',
        }),
      );
    });
  });

  describe('create duplicate checks', () => {
    it('throws ConflictException when email already exists', async () => {
      mockQueryBuilder(true);

      await expect(
        service.create(
          'hospital-1',
          {
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            phone: '555-0100',
          },
          actor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates patient when no duplicates found', async () => {
      mockQueryBuilder(false);

      const savedPatient = {
        id: 'patient-new',
        hospitalId: 'hospital-1',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-0100',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      patientsRepo.create.mockReturnValue(savedPatient);
      patientsRepo.save.mockResolvedValue(savedPatient);

      const result = await service.create(
        'hospital-1',
        {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-0100',
        },
        actor,
      );

      expect(result.fullName).toBe('Jane Doe');
      expect(patientsRepo.save).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', resource: 'patient' }),
      );
    });
  });

  describe('addDocument fileUrl validation', () => {
    it('rejects non-upload URL paths', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-1',
      });

      await expect(
        service.addDocument(
          'patient-1',
          'hospital-1',
          {
            name: 'scan.pdf',
            fileUrl: 'https://evil.example/files/secret.pdf',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the upload file is missing on disk', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-1',
      });
      existsSyncMock.mockReturnValue(false);

      await expect(
        service.addDocument(
          'patient-1',
          'hospital-1',
          {
            name: 'scan.pdf',
            fileUrl: 'https://evil.example/uploads/missing-file.pdf',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores a relative /uploads path for valid local files', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-1',
      });
      relatedRepo.find.mockResolvedValue([]);
      relatedRepo.create.mockImplementation((row: unknown) => row);
      relatedRepo.save.mockImplementation((row: unknown) =>
        Promise.resolve(row),
      );
      existsSyncMock.mockReturnValue(true);

      const result = await service.addDocument(
        'patient-1',
        'hospital-1',
        {
          name: 'scan.pdf',
          fileUrl: 'http://localhost:4000/uploads/a1b2c3d4-e5f6.pdf',
        },
        'user-1',
      );

      expect(result.fileUrl).toBe('/uploads/a1b2c3d4-e5f6.pdf');
    });
  });
});
