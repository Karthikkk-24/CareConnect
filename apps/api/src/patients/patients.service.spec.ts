import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { QueryFailedError } from 'typeorm';
import {
  Admission,
  Appointment,
  LabOrder,
  Patient,
  PatientAllergy,
  PatientConsent,
  PatientDocument,
  PatientEmergencyContact,
  PatientImportJob,
  PatientInsurance,
  PatientMedicalHistory,
  PatientMedication,
  Prescription,
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
    manager: {
      transaction: jest.fn(),
    },
  };

  const relatedRepo = {
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  };

  const labResultsRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockUploadUrlQb = (rows: unknown[] = []) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    return qb;
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
    relatedRepo.createQueryBuilder.mockImplementation(() => mockUploadUrlQb([]));
    relatedRepo.manager.getRepository.mockReturnValue(labResultsRepo);
    labResultsRepo.createQueryBuilder.mockImplementation(() => mockUploadUrlQb([]));
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
        userId: 'portal-1',
      };
      const patientQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(patient),
      };
      patientsRepo.manager.transaction.mockImplementation(
        (cb: (m: Record<string, unknown>) => unknown) => {
          const repoByEntity = new Map<unknown, Record<string, unknown>>([
            [
              Patient,
              {
                save: jest.fn().mockResolvedValue(patient),
                softRemove: jest.fn().mockResolvedValue(patient),
              },
            ],
            [
              Admission,
              {
                findOne: jest.fn().mockResolvedValue(null),
              },
            ],
            [
              PatientDocument,
              {
                find: jest.fn().mockResolvedValue([]),
                remove: jest.fn(),
              },
            ],
            [
              // LabOrder / LabResult repos still used via getRepository
              'LabOrder',
              {
                find: jest.fn().mockResolvedValue([]),
              },
            ],
          ]);
          const manager = {
            createQueryBuilder: jest.fn().mockReturnValue(patientQb),
            getRepository: (entity: unknown) => {
              if (entity === Patient) return repoByEntity.get(Patient);
              if (entity === Admission) return repoByEntity.get(Admission);
              if (entity === PatientDocument)
                return repoByEntity.get(PatientDocument);
              return {
                find: jest.fn().mockResolvedValue([]),
                remove: jest.fn(),
                save: jest.fn(),
                softRemove: jest.fn(),
                findOne: jest.fn().mockResolvedValue(null),
              };
            },
          };
          return Promise.resolve(cb(manager));
        },
      );

      const result = await service.deletePatient(
        'patient-1',
        'hospital-1',
        actor,
      );

      expect(result).toBe(true);
      expect(patientsRepo.manager.transaction).toHaveBeenCalled();
      expect(patientQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          resource: 'patient',
          resourceId: 'patient-1',
        }),
      );
    });

    it('refuses delete when an active admission exists under the patient lock', async () => {
      const patient = {
        id: 'patient-1',
        hospitalId: 'hospital-1',
        fullName: 'Jane Doe',
      };
      const patientQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(patient),
      };
      patientsRepo.manager.transaction.mockImplementation(
        (cb: (m: Record<string, unknown>) => unknown) => {
          const manager = {
            createQueryBuilder: jest.fn().mockReturnValue(patientQb),
            getRepository: (entity: unknown) => {
              if (entity === Admission) {
                return {
                  findOne: jest
                    .fn()
                    .mockResolvedValue({ id: 'adm-1', status: 'active' }),
                };
              }
              return {
                save: jest.fn(),
                softRemove: jest.fn(),
                find: jest.fn().mockResolvedValue([]),
                remove: jest.fn(),
              };
            },
          };
          return Promise.resolve(cb(manager));
        },
      );

      await expect(
        service.deletePatient('patient-1', 'hospital-1', actor),
      ).rejects.toThrow(BadRequestException);
      expect(patientQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('cancels open Rx, labs, and appointments before soft-delete', async () => {
      const patient = {
        id: 'patient-1',
        hospitalId: 'hospital-1',
        fullName: 'Jane Doe',
        userId: undefined,
      };
      const patientQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(patient),
      };
      const pendingRx = { id: 'rx-1', status: 'pending' };
      const openLab = { id: 'lab-1', status: 'ordered' };
      const openAppt = { id: 'appt-1', status: 'scheduled', notes: undefined };
      const rxSave = jest.fn().mockResolvedValue(pendingRx);
      const labSave = jest.fn().mockResolvedValue(openLab);
      const apptSave = jest.fn().mockResolvedValue(openAppt);
      const labFind = jest
        .fn()
        .mockResolvedValueOnce([openLab])
        .mockResolvedValueOnce([]);

      patientsRepo.manager.transaction.mockImplementation(
        (cb: (m: Record<string, unknown>) => unknown) => {
          const manager = {
            createQueryBuilder: jest.fn().mockReturnValue(patientQb),
            getRepository: (entity: unknown) => {
              if (entity === Patient) {
                return {
                  save: jest.fn().mockResolvedValue(patient),
                  softRemove: jest.fn().mockResolvedValue(patient),
                };
              }
              if (entity === Admission) {
                return { findOne: jest.fn().mockResolvedValue(null) };
              }
              if (entity === PatientDocument) {
                return {
                  find: jest.fn().mockResolvedValue([]),
                  remove: jest.fn(),
                };
              }
              if (entity === Prescription) {
                return {
                  find: jest.fn().mockResolvedValue([pendingRx]),
                  save: rxSave,
                };
              }
              if (entity === Appointment) {
                return {
                  find: jest.fn().mockResolvedValue([openAppt]),
                  save: apptSave,
                };
              }
              if (entity === LabOrder) {
                return { find: labFind, save: labSave };
              }
              return {
                find: jest.fn().mockResolvedValue([]),
                save: jest.fn(),
                remove: jest.fn(),
              };
            },
          };
          return Promise.resolve(cb(manager));
        },
      );

      await service.deletePatient('patient-1', 'hospital-1', actor);

      expect(rxSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rx-1', status: 'cancelled' }),
      );
      expect(labSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lab-1', status: 'cancelled' }),
      );
      expect(apptSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appt-1',
          status: 'cancelled',
          notes: 'Cancelled: patient soft-deleted',
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            cancelledPrescriptions: 1,
            cancelledLabOrders: 1,
            cancelledAppointments: 1,
          }),
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

      patientsRepo.manager.transaction.mockImplementation(
        (cb: (m: Record<string, unknown>) => unknown) => {
          const manager = {
            save: jest.fn((entity: unknown) =>
              Promise.resolve(
                typeof entity === 'object' && entity && 'id' in entity
                  ? entity
                  : savedPatient,
              ),
            ),
            create: jest.fn(
              (_entity: unknown, data: Record<string, unknown>) => ({
                ...savedPatient,
                ...data,
              }),
            ),
            getRepository: () => relatedRepo,
          };
          return Promise.resolve(cb(manager));
        },
      );
      patientsRepo.findOne.mockResolvedValue(savedPatient);

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

    it('rejects when the upload is already linked to a lab result', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-1',
      });
      labResultsRepo.createQueryBuilder.mockImplementation(() =>
        mockUploadUrlQb([{ id: 'lab-result-1' }]),
      );
      existsSyncMock.mockReturnValue(true);

      await expect(
        service.addDocument(
          'patient-1',
          'hospital-1',
          {
            name: 'scan.pdf',
            fileUrl: '/uploads/a1b2c3d4-e5f6.pdf',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps unique file_url violation to ConflictException', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-1',
      });
      relatedRepo.create.mockImplementation((row: unknown) => row);
      const uniqueError = new QueryFailedError('INSERT', [], new Error('dup'));
      (uniqueError as QueryFailedError & { code?: string }).code = '23505';
      relatedRepo.save.mockRejectedValue(uniqueError);
      existsSyncMock.mockReturnValue(true);

      await expect(
        service.addDocument(
          'patient-1',
          'hospital-1',
          {
            name: 'scan.pdf',
            fileUrl: '/uploads/a1b2c3d4-e5f6.pdf',
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('linkPatientAccount', () => {
    const patientBase = {
      id: 'patient-1',
      hospitalId: 'hospital-1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      userId: null as string | null,
    };

    const patientRoleUser = {
      id: 'portal-1',
      email: 'jane@example.com',
      userRoles: [{ role: { slug: 'patient' } }],
    };

    it('links when chart email matches portal user email', async () => {
      patientsRepo.findOne
        .mockResolvedValueOnce({ ...patientBase })
        .mockResolvedValueOnce(null);
      usersRepo.findOne.mockResolvedValue(patientRoleUser);
      patientsRepo.save.mockImplementation((row: unknown) =>
        Promise.resolve(row),
      );

      const result = await service.linkPatientAccount(
        'patient-1',
        'hospital-1',
        actor,
        'portal-1',
      );

      expect(result.userId).toBe('portal-1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'link_account',
          resource: 'patient',
          resourceId: 'patient-1',
        }),
      );
    });

    it('rejects when portal email does not match chart email', async () => {
      patientsRepo.findOne.mockResolvedValue({ ...patientBase });
      usersRepo.findOne.mockResolvedValue({
        ...patientRoleUser,
        email: 'other@example.com',
      });

      await expect(
        service.linkPatientAccount(
          'patient-1',
          'hospital-1',
          actor,
          'portal-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(patientsRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when chart email is missing', async () => {
      patientsRepo.findOne.mockResolvedValue({
        ...patientBase,
        email: null,
      });
      usersRepo.findOne.mockResolvedValue(patientRoleUser);

      await expect(
        service.linkPatientAccount(
          'patient-1',
          'hospital-1',
          actor,
          'portal-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(patientsRepo.save).not.toHaveBeenCalled();
    });
  });
});
