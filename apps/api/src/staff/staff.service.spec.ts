import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Role,
  StaffInvite,
  StaffProfile,
  User,
  UserRole,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { ClerkAdminService } from '../clerk/clerk-admin.service';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  let service: StaffService;

  const staffRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };
  const usersRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const rolesRepo = { findOne: jest.fn() };
  const userRolesRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
  const invitesRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      return qb;
    }),
    manager: {
      transaction: jest.fn(),
    },
  };
  const clerkAdmin = {
    isConfigured: jest.fn().mockReturnValue(false),
    inviteStaffByEmail: jest.fn(),
    deactivateUser: jest.fn(),
    reactivateUser: jest.fn(),
  };
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
        { provide: ClerkAdminService, useValue: clerkAdmin },
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
      expect(() =>
        service.assertHospitalAccess(hospitalAdmin, 'hospital-a'),
      ).not.toThrow();
    });

    it('denies access for wrong hospital', () => {
      expect(() =>
        service.assertHospitalAccess(hospitalAdmin, 'hospital-b'),
      ).toThrow(ForbiddenException);
    });

    it('denies access when user has no hospital context', () => {
      expect(() =>
        service.assertHospitalAccess(
          { ...hospitalAdmin, hospitalId: undefined },
          'hospital-a',
        ),
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

  describe('create — cross-hospital invite', () => {
    function mockCreateTransaction(
      existingUser: Record<string, unknown> | null,
    ) {
      staffRepo.manager.transaction.mockImplementation(
        (cb: (m: Record<string, unknown>) => unknown) => {
          const manager = {
            getRepository: (entity: unknown) => {
              if (entity === User) {
                return {
                  createQueryBuilder: () => ({
                    leftJoinAndSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(existingUser),
                  }),
                  update: usersRepo.update,
                  save: usersRepo.save,
                  create: usersRepo.create,
                };
              }
              if (entity === UserRole) return userRolesRepo;
              if (entity === StaffProfile) return staffRepo;
              if (entity === StaffInvite) return invitesRepo;
              return {};
            },
          };
          return Promise.resolve(cb(manager));
        },
      );
    }

    it('rejects inviting a user who already belongs to another hospital', async () => {
      rolesRepo.findOne.mockResolvedValue({
        id: 'role-doctor',
        slug: 'doctor',
      });
      mockCreateTransaction({
        id: 'user-1',
        email: 'doc@example.com',
        hospitalId: 'hospital-b',
        fullName: 'Existing Doc',
        authId: 'auth-1',
        userRoles: [],
      });

      await expect(
        service.create(
          'hospital-a',
          {
            email: 'doc@example.com',
            fullName: 'Existing Doc',
            roleSlug: 'doctor',
          },
          hospitalAdmin,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(userRolesRepo.save).not.toHaveBeenCalled();
      expect(staffRepo.save).not.toHaveBeenCalled();
    });

    it('rejects inviting a patient portal user as staff', async () => {
      rolesRepo.findOne.mockResolvedValue({
        id: 'role-doctor',
        slug: 'doctor',
      });
      mockCreateTransaction({
        id: 'user-1',
        email: 'patient@example.com',
        hospitalId: null,
        fullName: 'Portal Patient',
        authId: 'user_live',
        userRoles: [{ role: { slug: 'patient' } }],
      });

      await expect(
        service.create(
          'hospital-a',
          {
            email: 'patient@example.com',
            fullName: 'Portal Patient',
            roleSlug: 'doctor',
          },
          hospitalAdmin,
        ),
      ).rejects.toThrow(/patient portal account/i);

      expect(usersRepo.update).not.toHaveBeenCalled();
      expect(staffRepo.save).not.toHaveBeenCalled();
    });

    it('preserves a live Clerk authId when inviting a hospital-less user', async () => {
      rolesRepo.findOne.mockResolvedValue({
        id: 'role-doctor',
        slug: 'doctor',
      });
      staffRepo.findOne.mockResolvedValue(null);
      userRolesRepo.findOne.mockResolvedValue(null);
      staffRepo.create.mockImplementation((row: unknown) => row);
      staffRepo.save.mockResolvedValue({ id: 'staff-1' });
      invitesRepo.create.mockImplementation((row: unknown) => row);
      invitesRepo.save.mockResolvedValue({});
      staffRepo.findOne.mockResolvedValueOnce(null).mockResolvedValue({
        id: 'staff-1',
        userId: 'user-1',
        hospitalId: 'hospital-a',
        user: {
          fullName: 'Existing User',
          email: 'free@example.com',
          userRoles: [{ role: { slug: 'doctor' } }],
        },
      });
      mockCreateTransaction({
        id: 'user-1',
        email: 'free@example.com',
        hospitalId: null,
        fullName: 'Existing User',
        authId: 'user_live_clerk',
        userRoles: [],
      });

      await service.create(
        'hospital-a',
        {
          email: 'free@example.com',
          fullName: 'Existing User',
          roleSlug: 'doctor',
        },
        hospitalAdmin,
      );

      expect(usersRepo.update).toHaveBeenCalledWith('user-1', {
        hospitalId: 'hospital-a',
        fullName: 'Existing User',
        authId: 'user_live_clerk',
      });
    });
  });

  describe('acceptInvite — deactivated staff', () => {
    it('rejects invite acceptance when staff profile is inactive', async () => {
      const invite = {
        token: 'tok',
        email: 'doc@example.com',
        hospitalId: 'hospital-a',
        staffProfileId: 'staff-1',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      };
      const inactiveStaff = {
        id: 'staff-1',
        userId: 'user-1',
        hospitalId: 'hospital-a',
        isActive: false,
        user: { email: 'doc@example.com', isActive: false },
      };
      invitesRepo.manager.transaction.mockImplementation(
        (cb: (m: Record<string, unknown>) => unknown) => {
          const manager = {
            getRepository: (entity: unknown) => {
              if (entity === StaffInvite) {
                return {
                  createQueryBuilder: () => ({
                    setLock: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(invite),
                  }),
                  save: invitesRepo.save,
                };
              }
              if (entity === User) return usersRepo;
              if (entity === StaffProfile) {
                return {
                  findOne: jest.fn().mockResolvedValue(inactiveStaff),
                };
              }
              return {};
            },
          };
          return Promise.resolve(cb(manager));
        },
      );

      await expect(
        service.acceptInvite('tok', 'auth-new', 'doc@example.com'),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — invalidate invites', () => {
    it('expires outstanding invites when staff is deactivated', async () => {
      staffRepo.findOne.mockResolvedValue({
        id: 'staff-1',
        userId: 'user-1',
        hospitalId: 'hospital-a',
        isActive: true,
        user: { email: 'doc@example.com', userRoles: [] },
      });
      staffRepo.save.mockImplementation((row: { isActive: boolean }) =>
        Promise.resolve(row),
      );
      usersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        authId: 'pending_abc',
      });

      await service.remove('staff-1', hospitalAdmin);

      expect(invitesRepo.createQueryBuilder).toHaveBeenCalled();
      expect(usersRepo.update).toHaveBeenCalledWith('user-1', {
        isActive: false,
      });
    });
  });
});
