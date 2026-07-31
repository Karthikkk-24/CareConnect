import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Patient, PatientDocument } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let service: UploadsService;

  const documentsRepo = {
    findOne: jest.fn(),
  };
  const patientsRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: getRepositoryToken(PatientDocument),
          useValue: documentsRepo,
        },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
      ],
    }).compile();

    service = module.get(UploadsService);
  });

  const staffUser: AuthenticatedUser = {
    id: 'staff-1',
    authId: 'auth-staff',
    email: 'doctor@hospital-a.com',
    fullName: 'Dr A',
    hospitalId: 'hospital-a',
    roles: ['doctor'],
    permissions: ['patients:read', 'patients:write'],
    onboardingCompleted: true,
  };

  const patientUser: AuthenticatedUser = {
    id: 'user-patient-1',
    authId: 'auth-patient',
    email: 'patient@example.com',
    fullName: 'Pat',
    hospitalId: undefined,
    roles: ['patient'],
    permissions: [],
    onboardingCompleted: true,
  };

  describe('assertCanUpload', () => {
    it('allows staff with patients:write', () => {
      expect(() => service.assertCanUpload(staffUser)).not.toThrow();
    });

    it('allows super_admin', () => {
      expect(() =>
        service.assertCanUpload({
          ...staffUser,
          roles: ['super_admin'],
          permissions: [],
        }),
      ).not.toThrow();
    });

    it('denies patient role', () => {
      expect(() => service.assertCanUpload(patientUser)).toThrow(
        ForbiddenException,
      );
    });

    it('denies staff without patients:write', () => {
      expect(() =>
        service.assertCanUpload({
          ...staffUser,
          permissions: ['patients:read'],
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertCanDownload', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      fileUrl: 'http://localhost:4000/uploads/abc.pdf',
      name: 'lab.pdf',
    };

    const patient = {
      id: 'patient-1',
      hospitalId: 'hospital-a',
      userId: 'user-patient-1',
    };

    it('throws NotFound when no document row matches', async () => {
      documentsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assertCanDownload('missing.pdf', staffUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows same-hospital staff with patients:read', async () => {
      documentsRepo.findOne.mockResolvedValue(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', staffUser),
      ).resolves.toEqual(document);
    });

    it('denies staff from another hospital', async () => {
      documentsRepo.findOne.mockResolvedValue(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          hospitalId: 'hospital-b',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows linked patient for their own document', async () => {
      documentsRepo.findOne.mockResolvedValue(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', patientUser),
      ).resolves.toEqual(document);
    });

    it('denies patient for another patient document', async () => {
      documentsRepo.findOne.mockResolvedValue(document);
      patientsRepo.findOne.mockResolvedValue({
        ...patient,
        userId: 'other-user',
      });

      await expect(
        service.assertCanDownload('abc.pdf', patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows super_admin across hospitals', async () => {
      documentsRepo.findOne.mockResolvedValue(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          roles: ['super_admin'],
          hospitalId: undefined,
          permissions: [],
        }),
      ).resolves.toEqual(document);
    });
  });
});
