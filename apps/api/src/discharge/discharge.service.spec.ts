import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Discharge, FollowUp, Patient } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { DischargeService } from './discharge.service';

describe('DischargeService', () => {
  let service: DischargeService;

  const manager = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
      id: 'discharge-1',
      ...data,
    })),
  };

  const dischargesRepo = {
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const followUpsRepo = { save: jest.fn(), create: jest.fn(), find: jest.fn() };
  const patientsRepo = { findOne: jest.fn(), save: jest.fn() };
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
        DischargeService,
        { provide: getRepositoryToken(Discharge), useValue: dischargesRepo },
        { provide: getRepositoryToken(FollowUp), useValue: followUpsRepo },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(DischargeService);
  });

  describe('createDischarge', () => {
    it('rejects duplicate discharge summary for the same admission', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'adm-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'active',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.findOne.mockResolvedValue({ id: 'existing-discharge' });

      await expect(
        service.createDischarge(
          'hospital-a',
          { admissionId: 'adm-1', summary: 'Recovered' },
          actor,
        ),
      ).rejects.toThrow(
        'A discharge summary already exists for this admission',
      );
    });
  });
});
