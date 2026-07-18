import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role, StaffInvite, StaffProfile, User, UserRole } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  let service: StaffService;

  const staffRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
  const usersRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() };
  const rolesRepo = { findOne: jest.fn() };
  const userRolesRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() };
  const invitesRepo = { save: jest.fn(), create: jest.fn(), findOne: jest.fn() };
  const supabaseAdmin = { isConfigured: jest.fn(), inviteUserByEmail: jest.fn() };
  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: getRepositoryToken(StaffProfile), useValue: staffRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Role), useValue: rolesRepo },
        { provide: getRepositoryToken(UserRole), useValue: userRolesRepo },
        { provide: getRepositoryToken(StaffInvite), useValue: invitesRepo },
        { provide: SupabaseAdminService, useValue: supabaseAdmin },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(StaffService);
  });

  const hospitalAdmin: AuthenticatedUser = {
    id: 'admin-1',
    authId: 'auth-admin',
    email: 'admin@hospital.com',
    fullName: 'Admin',
    hospitalId: 'hospital-a',
    roles: ['hospital_admin'],
    permissions: [],
    onboardingCompleted: true,
  };

  describe('assertHospitalAccess', () => {
    it('allows super_admin for any hospital', () => {
      expect(() =>
        service.assertHospitalAccess(
          { ...hospitalAdmin, roles: ['super_admin'], hospitalId: undefined },
          'hospital-b',
        ),
      ).not.toThrow();
    });

    it('allows access when hospital matches', () => {
      expect(() => service.assertHospitalAccess(hospitalAdmin, 'hospital-a')).not.toThrow();
    });

    it('denies access for wrong hospital', () => {
      expect(() => service.assertHospitalAccess(hospitalAdmin, 'hospital-b')).toThrow(
        ForbiddenException,
      );
    });

    it('denies access when user has no hospital context', () => {
      expect(() =>
        service.assertHospitalAccess({ ...hospitalAdmin, hospitalId: undefined }, 'hospital-a'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('resolveHospitalId', () => {
    it('returns user hospital when not super_admin', () => {
      expect(service.resolveHospitalId(hospitalAdmin)).toBe('hospital-a');
    });

    it('throws when hospital context is missing', () => {
      expect(() =>
        service.resolveHospitalId({ ...hospitalAdmin, hospitalId: undefined }),
      ).toThrow(NotFoundException);
    });
  });
});
