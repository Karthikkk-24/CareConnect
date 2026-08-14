import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  Hospital,
  LabOrder,
  LabResult,
  Patient,
  PatientDocument,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UploadsService } from './uploads.service';

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readdir: jest.fn(),
      stat: jest.fn(),
      unlink: jest.fn(),
    },
  };
});

const mockedFs = fs as unknown as {
  readdir: jest.Mock;
  stat: jest.Mock;
  unlink: jest.Mock;
};

describe('UploadsService', () => {
  let service: UploadsService;

  const documentsRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const patientsRepo = {
    findOne: jest.fn(),
  };
  const labResultsRepo = {
    createQueryBuilder: jest.fn(),
  };
  const labOrdersRepo = {
    findOne: jest.fn(),
  };
  const hospitalsRepo = {
    findOne: jest.fn(),
  };
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  };

  const emptyQb = () => ({
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    documentsRepo.createQueryBuilder.mockImplementation(emptyQb);
    labResultsRepo.createQueryBuilder.mockImplementation(emptyQb);
    hospitalsRepo.findOne.mockResolvedValue({
      id: 'hospital-a',
      isActive: true,
    });
    queryRunner.connect.mockResolvedValue(undefined);
    queryRunner.release.mockResolvedValue(undefined);
    queryRunner.query.mockImplementation((sql: string) => {
      if (sql.includes('pg_try_advisory_lock')) {
        return Promise.resolve([{ locked: true }]);
      }
      return Promise.resolve([]);
    });
    dataSource.createQueryRunner.mockReturnValue(queryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: getRepositoryToken(PatientDocument),
          useValue: documentsRepo,
        },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: getRepositoryToken(LabResult), useValue: labResultsRepo },
        { provide: getRepositoryToken(LabOrder), useValue: labOrdersRepo },
        { provide: getRepositoryToken(Hospital), useValue: hospitalsRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
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
    it('allows staff with patients:write', async () => {
      await expect(service.assertCanUpload(staffUser)).resolves.toBeUndefined();
    });

    it('allows super_admin', async () => {
      await expect(
        service.assertCanUpload({
          ...staffUser,
          roles: ['super_admin'],
          permissions: [],
        }),
      ).resolves.toBeUndefined();
    });

    it('denies staff without hospitalId', async () => {
      await expect(
        service.assertCanUpload({
          ...staffUser,
          hospitalId: undefined,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies patient role', async () => {
      await expect(service.assertCanUpload(patientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('denies staff without patients:write', async () => {
      await expect(
        service.assertCanUpload({
          ...staffUser,
          permissions: ['patients:read'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows lab technicians with lab:write', async () => {
      await expect(
        service.assertCanUpload({
          ...staffUser,
          roles: ['lab_technician'],
          permissions: ['lab:write'],
        }),
      ).resolves.toBeUndefined();
    });

    it('denies upload when actor hospital is inactive', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: false,
      });

      await expect(service.assertCanUpload(staffUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('denies super_admin upload when their hospitalId is inactive', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: false,
      });

      await expect(
        service.assertCanUpload({
          ...staffUser,
          roles: ['super_admin'],
          permissions: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies super_admin without hospital context', async () => {
      await expect(
        service.assertCanUpload({
          ...staffUser,
          hospitalId: undefined,
          roles: ['super_admin'],
          permissions: [],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(hospitalsRepo.findOne).not.toHaveBeenCalled();
    });

    it('allows unbound super_admin when explicit hospitalId is active', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-b',
        isActive: true,
      });

      await expect(
        service.assertCanUpload(
          {
            ...staffUser,
            hospitalId: undefined,
            roles: ['super_admin'],
            permissions: [],
          },
          'hospital-b',
        ),
      ).resolves.toBeUndefined();
      expect(hospitalsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'hospital-b' },
      });
    });

    it('denies unbound super_admin when explicit hospitalId is inactive', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-b',
        isActive: false,
      });

      await expect(
        service.assertCanUpload(
          {
            ...staffUser,
            hospitalId: undefined,
            roles: ['super_admin'],
            permissions: [],
          },
          'hospital-b',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ignores hospitalId override for non-super_admin staff', async () => {
      await expect(
        service.assertCanUpload(staffUser, 'hospital-b'),
      ).resolves.toBeUndefined();
      expect(hospitalsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'hospital-a' },
      });
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

    const mockDocLookup = (doc: typeof document | null) => {
      documentsRepo.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(doc ? [doc] : []),
      }));
    };

    const mockLabLookup = (
      result: { id: string; labOrderId: string } | null,
    ) => {
      labResultsRepo.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(result ? [result] : []),
      }));
    };

    it('throws NotFound when no document or lab result matches', async () => {
      mockDocLookup(null);
      mockLabLookup(null);
      await expect(
        service.assertCanDownload('missing.pdf', staffUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects filenames with LIKE wildcards without querying', async () => {
      await expect(
        service.assertCanDownload('%.pdf', staffUser),
      ).rejects.toThrow(NotFoundException);
      expect(documentsRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('allows same-hospital staff with patients:read', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', staffUser),
      ).resolves.toBeUndefined();
    });

    it('allows lab result download for staff with lab:write', async () => {
      mockDocLookup(null);
      mockLabLookup({ id: 'lr-1', labOrderId: 'lo-1' });
      labOrdersRepo.findOne.mockResolvedValue({
        id: 'lo-1',
        patientId: 'patient-1',
        hospitalId: 'hospital-a',
      });
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          roles: ['lab_technician'],
          permissions: ['lab:write', 'patients:read'],
        }),
      ).resolves.toBeUndefined();
    });

    it('denies staff from another hospital', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          hospitalId: 'hospital-b',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows linked patient for their own document', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', patientUser),
      ).resolves.toBeUndefined();
    });

    it('denies download when patient hospital is inactive', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: false,
      });

      await expect(
        service.assertCanDownload('abc.pdf', patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies download when patient hospital is missing', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);
      hospitalsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assertCanDownload('abc.pdf', staffUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies patient for another patient document', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue({
        ...patient,
        userId: 'other-user',
      });

      await expect(
        service.assertCanDownload('abc.pdf', patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows dual-role doctor+patient to download hospital docs', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue({
        ...patient,
        userId: 'other-patient',
      });

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          roles: ['doctor', 'patient'],
        }),
      ).resolves.toBeUndefined();
    });

    it('allows super_admin across active hospitals', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          roles: ['super_admin'],
          hospitalId: undefined,
          permissions: [],
        }),
      ).resolves.toBeUndefined();
    });

    it('denies super_admin download when patient hospital is inactive', async () => {
      mockDocLookup(document);
      patientsRepo.findOne.mockResolvedValue(patient);
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: false,
      });

      await expect(
        service.assertCanDownload('abc.pdf', {
          ...staffUser,
          roles: ['super_admin'],
          hospitalId: undefined,
          permissions: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeOrphanUploads', () => {
    const NOW = new Date('2026-08-02T12:00:00Z');
    const ORPHAN = '123e4567-e89b-42d3-a456-426614174000.pdf';
    const LINKED = '123e4567-e89b-42d3-a456-426614174001.pdf';
    const NOT_UUID = 'readme.txt';
    const DOTFILE = '...env';

    const statFor = (mtimeMs: number) => ({
      isFile: () => true,
      mtimeMs,
    });
    const oldEnough = NOW.getTime() - 48 * 60 * 60 * 1000; // 48h ago (TTL is 24h)
    const tooRecent = NOW.getTime() - 60 * 60 * 1000; // 1h ago

    it('removes old uploads that have no document or lab result row', async () => {
      mockedFs.readdir.mockResolvedValue([ORPHAN, LINKED, NOT_UUID, DOTFILE]);
      mockedFs.stat.mockResolvedValue(statFor(oldEnough));
      let lookup = 0;
      documentsRepo.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockImplementation(() => {
          lookup += 1;
          // First UUID file = orphan; second = linked document
          return Promise.resolve(lookup === 1 ? [] : [{ id: 'doc-1' }]);
        }),
      }));
      labResultsRepo.createQueryBuilder.mockImplementation(emptyQb);

      await service.removeOrphanUploads(NOW);

      expect(mockedFs.unlink).toHaveBeenCalledTimes(1);
      expect(mockedFs.unlink).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', ORPHAN),
      );
    });

    it('keeps files referenced by lab results', async () => {
      mockedFs.readdir.mockResolvedValue([ORPHAN]);
      mockedFs.stat.mockResolvedValue(statFor(oldEnough));
      documentsRepo.createQueryBuilder.mockImplementation(emptyQb);
      labResultsRepo.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'lr-1' }]),
      }));

      await service.removeOrphanUploads(NOW);

      expect(mockedFs.unlink).not.toHaveBeenCalled();
    });

    it('keeps files newer than the TTL even when unlinked', async () => {
      mockedFs.readdir.mockResolvedValue([ORPHAN]);
      mockedFs.stat.mockResolvedValue(statFor(tooRecent));

      await service.removeOrphanUploads(NOW);

      expect(mockedFs.unlink).not.toHaveBeenCalled();
      expect(documentsRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('releases the advisory lock and query runner when uploads dir is missing', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('ENOENT'));

      await expect(service.removeOrphanUploads(NOW)).resolves.toBeUndefined();

      const calls = queryRunner.query.mock.calls as [string, ...unknown[]][];
      const unlock = calls.find(([sql]) => sql.includes('pg_advisory_unlock'));
      expect(unlock).toBeDefined();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('does nothing when another instance already holds the lock', async () => {
      queryRunner.query.mockImplementation((sql: string) => {
        if (sql.includes('pg_try_advisory_lock')) {
          return Promise.resolve([{ locked: false }]);
        }
        return Promise.resolve([]);
      });

      await service.removeOrphanUploads(NOW);

      expect(mockedFs.readdir).not.toHaveBeenCalled();
      expect(mockedFs.unlink).not.toHaveBeenCalled();
      const unlock = (
        queryRunner.query.mock.calls as [string, ...unknown[]][]
      ).find(([sql]) => sql.includes('pg_advisory_unlock'));
      expect(unlock).toBeUndefined();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
