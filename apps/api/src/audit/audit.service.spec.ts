import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  const auditRepo = {
    save: jest.fn(),
    create: jest.fn((row: unknown) => row),
    createQueryBuilder: jest.fn(),
  };

  const actor: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'admin@hospital.com',
    fullName: 'Admin',
    hospitalId: 'hospital-1',
    roles: ['hospital_admin'],
    permissions: ['reports:read'],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
      ],
    }).compile();
    service = module.get(AuditService);
  });

  describe('resolveHospitalId', () => {
    it('uses the caller hospital by default', () => {
      expect(service.resolveHospitalId(actor)).toBe('hospital-1');
    });

    it('rejects cross-hospital access for non-super-admin', () => {
      expect(() => service.resolveHospitalId(actor, 'hospital-other')).toThrow(
        ForbiddenException,
      );
    });

    it('requires hospital context when none is available', () => {
      expect(() =>
        service.resolveHospitalId({
          ...actor,
          hospitalId: undefined,
          roles: ['hospital_admin'],
        }),
      ).toThrow(NotFoundException);
    });
  });

  describe('listHospitalLogs', () => {
    it('returns projected rows without metadata', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'log-1',
              actorId: 'user-1',
              actor: { email: 'admin@hospital.com', fullName: 'Admin' },
              hospitalId: 'hospital-1',
              action: 'delete',
              resource: 'patient',
              resourceId: 'patient-1',
              metadata: { fullName: 'secret' },
              createdAt: new Date('2026-01-01T00:00:00Z'),
            },
          ],
          1,
        ]),
      };
      auditRepo.createQueryBuilder.mockReturnValue(qb);

      const page = await service.listHospitalLogs('hospital-1', { limit: 25 });

      expect(page.total).toBe(1);
      expect(page.items[0]).toEqual(
        expect.objectContaining({
          id: 'log-1',
          actorEmail: 'admin@hospital.com',
          actorName: 'Admin',
          action: 'delete',
          resource: 'patient',
        }),
      );
      expect(page.items[0]).not.toHaveProperty('metadata');
      expect(qb.take).toHaveBeenCalledWith(25);
    });
  });
});
