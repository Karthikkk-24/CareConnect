import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Admission, Bed, Patient, Ward } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { AdmissionsService } from './admissions.service';

describe('AdmissionsService', () => {
  let service: AdmissionsService;

  const manager = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity, data) => data),
  };

  const admissionsRepo = {
    manager: {
      transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
        cb(manager),
      ),
    },
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const patientsRepo = { findOne: jest.fn(), save: jest.fn() };
  const wardsRepo = { findOne: jest.fn(), find: jest.fn() };
  const bedsRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
  const audit = { log: jest.fn() };

  const actor: AuthenticatedUser = {
    id: 'admin-1',
    authId: 'auth-1',
    email: 'admin@h.com',
    fullName: 'Admin',
    hospitalId: 'hospital-a',
    roles: ['hospital_admin'],
    permissions: [],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionsService,
        { provide: getRepositoryToken(Admission), useValue: admissionsRepo },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: getRepositoryToken(Ward), useValue: wardsRepo },
        { provide: getRepositoryToken(Bed), useValue: bedsRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AdmissionsService);
  });

  describe('admitPatient concurrency guards', () => {
    it('rejects when bed is already occupied after lock', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'patient-1',
          hospitalId: 'hospital-a',
          status: 'registered',
        })
        .mockResolvedValueOnce({ id: 'ward-1', hospitalId: 'hospital-a' });

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'bed-1',
          status: 'occupied',
          hospitalId: 'hospital-a',
          wardId: 'ward-1',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.admitPatient(
          'hospital-a',
          {
            patientId: 'patient-1',
            wardId: 'ward-1',
            bedId: 'bed-1',
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('rejects when patient already has an active admission', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'patient-1',
          hospitalId: 'hospital-a',
          status: 'registered',
        })
        .mockResolvedValueOnce({ id: 'ward-1', hospitalId: 'hospital-a' })
        .mockResolvedValueOnce({ id: 'adm-existing', status: 'active' });

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'bed-1',
          status: 'available',
          hospitalId: 'hospital-a',
          wardId: 'ward-1',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.admitPatient(
          'hospital-a',
          {
            patientId: 'patient-1',
            wardId: 'ward-1',
            bedId: 'bed-1',
          },
          actor,
        ),
      ).rejects.toThrow('Patient already has an active admission');
    });

    it('throws NotFound when patient missing', async () => {
      manager.findOne.mockResolvedValueOnce(null);
      await expect(
        service.admitPatient(
          'hospital-a',
          {
            patientId: 'missing',
            wardId: 'ward-1',
            bedId: 'bed-1',
          },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
