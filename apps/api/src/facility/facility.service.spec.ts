import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bed, Department, Ward } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { FacilityService } from './facility.service';

describe('FacilityService', () => {
  let service: FacilityService;

  const departmentsRepo = {};
  const wardsRepo = {};
  const bedsRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
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
        FacilityService,
        { provide: getRepositoryToken(Department), useValue: departmentsRepo },
        { provide: getRepositoryToken(Ward), useValue: wardsRepo },
        { provide: getRepositoryToken(Bed), useValue: bedsRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(FacilityService);
  });

  describe('updateBedStatus', () => {
    it('sets available bed to maintenance', async () => {
      const bed = {
        id: 'bed-1',
        hospitalId: 'hospital-a',
        wardId: 'ward-1',
        label: 'A1',
        status: 'available',
        createdAt: new Date(),
      };
      bedsRepo.findOne.mockResolvedValue(bed);
      bedsRepo.save.mockImplementation((row: typeof bed) =>
        Promise.resolve(row),
      );

      const result = await service.updateBedStatus(
        'hospital-a',
        { bedId: 'bed-1', status: 'maintenance' },
        actor,
      );
      expect(result.status).toBe('maintenance');
    });

    it('rejects changing an occupied bed', async () => {
      bedsRepo.findOne.mockResolvedValue({
        id: 'bed-1',
        hospitalId: 'hospital-a',
        status: 'occupied',
      });

      await expect(
        service.updateBedStatus(
          'hospital-a',
          { bedId: 'bed-1', status: 'maintenance' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
