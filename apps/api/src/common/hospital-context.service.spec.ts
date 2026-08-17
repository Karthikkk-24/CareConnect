import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Hospital } from '../database/entities';
import { HospitalContextService } from './hospital-context.service';

describe('HospitalContextService', () => {
  let service: HospitalContextService;
  const hospitalsRepo = { findOne: jest.fn() };

  const hospitalAdmin: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'admin@hospital.com',
    fullName: 'Admin',
    hospitalId: 'hospital-a',
    hospitalActive: true,
    roles: ['hospital_admin'],
    permissions: ['patients:write'],
    onboardingCompleted: true,
  };

  const superAdmin: AuthenticatedUser = {
    ...hospitalAdmin,
    id: 'super-1',
    roles: ['super_admin'],
    hospitalId: undefined,
    hospitalActive: true,
    permissions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalContextService,
        { provide: getRepositoryToken(Hospital), useValue: hospitalsRepo },
      ],
    }).compile();
    service = module.get(HospitalContextService);
  });

  describe('resolveHospitalId', () => {
    it('returns the caller hospital when it is active', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: true,
      });

      await expect(service.resolveHospitalId(hospitalAdmin)).resolves.toBe(
        'hospital-a',
      );
    });

    it('throws when hospital context is missing', async () => {
      await expect(
        service.resolveHospitalId({ ...hospitalAdmin, hospitalId: undefined }),
      ).rejects.toThrow(NotFoundException);
      expect(hospitalsRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects tenant writes when the hospital exists and is inactive', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: false,
      });

      await expect(service.resolveHospitalId(hospitalAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects tenant reads when the hospital is inactive', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-a',
        isActive: false,
      });

      await expect(
        service.resolveHospitalId(hospitalAdmin, undefined, { write: false }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not throw when the hospital row is missing', async () => {
      hospitalsRepo.findOne.mockResolvedValue(null);

      await expect(service.resolveHospitalId(hospitalAdmin)).resolves.toBe(
        'hospital-a',
      );
    });

    it('rejects super_admin writes to an inactive hospital', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-b',
        isActive: false,
      });

      await expect(
        service.resolveHospitalId(superAdmin, 'hospital-b', { write: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows super_admin to read an inactive hospital', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-b',
        isActive: false,
      });

      await expect(
        service.resolveHospitalId(superAdmin, 'hospital-b', { write: false }),
      ).resolves.toBe('hospital-b');
    });

    it('allows super_admin writes to an active hospital', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-b',
        isActive: true,
      });

      await expect(
        service.resolveHospitalId(superAdmin, 'hospital-b', { write: true }),
      ).resolves.toBe('hospital-b');
    });

    it('defaults to write and blocks super_admin when write is omitted', async () => {
      hospitalsRepo.findOne.mockResolvedValue({
        id: 'hospital-b',
        isActive: false,
      });

      await expect(
        service.resolveHospitalId(superAdmin, 'hospital-b'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
