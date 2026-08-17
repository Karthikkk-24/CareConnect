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
    manager: {
      query: jest.fn().mockResolvedValue([{ count: 0 }]),
    },
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
    userRolesRepo.manager.query.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('COUNT(*)')) {
        return Promise.resolve([{ count: 0 }]);
      }
      return Promise.resolve(undefined);
    });

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

  const hospitalManager: AuthenticatedUser = {
    ...hospitalAdmin,
    id: 'manager-1',
    authId: 'auth-manager',
    email: 'manager@hospital.com',
    fullName: 'Manager',
    roles: ['hospital_manager'],
  };

  const superAdmin: AuthenticatedUser = {
    ...hospitalAdmin,
    id: 'super-1',
    authId: 'auth-super',
    email: 'super@platform.com',
    fullName: 'Super',
    hospitalId: undefined,
    roles: ['super_admin'],
  };

  function mockActiveAdminCount(count: number) {
    userRolesRepo.manager.query.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('COUNT(*)')) {
        return Promise.resolve([{ count }]);
      }
      return Promise.resolve(undefined);
    });
  }

  function mockCreateTransaction(existingUser: Record<string, unknown> | null) {
    const query = jest.fn().mockResolvedValue(undefined);
    staffRepo.manager.transaction.mockImplementation(
      (cb: (m: Record<string, unknown>) => unknown) => {
        const manager = {
          query,
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
    return { query };
  }

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

  describe('resendStaffInvite', () => {
    const pendingStaff = {
      id: 'staff-1',
      userId: 'user-1',
      hospitalId: 'hospital-a',
      isActive: true,
      user: {
        email: 'doc@example.com',
        fullName: 'Doc',
        userRoles: [{ role: { slug: 'doctor' } }],
      },
    };

    it('rotates token and resets expiry for pending invites', async () => {
      staffRepo.findOne.mockResolvedValue({ ...pendingStaff });
      const invite = {
        id: 'invite-1',
        staffProfileId: 'staff-1',
        email: 'doc@example.com',
        acceptedAt: null,
        token: 'old-token',
        expiresAt: new Date(Date.now() - 1000),
      };
      invitesRepo.findOne.mockResolvedValue(invite);
      invitesRepo.save.mockImplementation((row: unknown) =>
        Promise.resolve(row),
      );

      const result = await service.resendStaffInvite('staff-1', hospitalAdmin);

      expect(result.inviteToken).toBeDefined();
      expect(result.inviteToken).not.toBe('old-token');
      expect(invite.token).toBe(result.inviteToken);
      expect(invite.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resend_invite',
          resource: 'staff',
          resourceId: 'staff-1',
        }),
      );
    });

    it('rejects when invite was already accepted', async () => {
      staffRepo.findOne.mockResolvedValue({ ...pendingStaff });
      invitesRepo.findOne.mockResolvedValue({
        id: 'invite-1',
        staffProfileId: 'staff-1',
        acceptedAt: new Date(),
        token: 'old-token',
      });

      await expect(
        service.resendStaffInvite('staff-1', hospitalAdmin),
      ).rejects.toThrow(BadRequestException);
      expect(invitesRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when staff member is not found', async () => {
      staffRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resendStaffInvite('missing', hospitalAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hospital_admin last-admin lockout', () => {
    const lastAdminStaff = {
      id: 'staff-admin',
      userId: 'admin-1',
      hospitalId: 'hospital-a',
      isActive: true,
      user: {
        email: 'admin@hospital.com',
        userRoles: [
          { role: { slug: 'hospital_admin' }, hospitalId: 'hospital-a' },
        ],
      },
    };

    it('rejects removing the last active hospital_admin', async () => {
      staffRepo.findOne.mockResolvedValue({ ...lastAdminStaff });
      mockActiveAdminCount(0);
      usersRepo.findOne.mockResolvedValue({
        id: 'admin-1',
        authId: 'user_live_admin',
      });

      await expect(
        service.remove('staff-admin', hospitalAdmin),
      ).rejects.toThrow(/Invite a replacement administrator first/);

      expect(staffRepo.save).not.toHaveBeenCalled();
      expect(usersRepo.update).not.toHaveBeenCalled();
      expect(clerkAdmin.deactivateUser).not.toHaveBeenCalled();
    });

    it('allows removing a hospital_admin when another remains active', async () => {
      staffRepo.findOne.mockResolvedValue({ ...lastAdminStaff });
      mockActiveAdminCount(1);
      staffRepo.save.mockImplementation((row: { isActive: boolean }) =>
        Promise.resolve(row),
      );
      usersRepo.findOne.mockResolvedValue({
        id: 'admin-1',
        authId: 'pending_abc',
      });

      await expect(service.remove('staff-admin', superAdmin)).resolves.toBe(
        true,
      );

      expect(usersRepo.update).toHaveBeenCalledWith('admin-1', {
        isActive: false,
      });
    });

    it('rejects deactivating the last active hospital_admin', async () => {
      staffRepo.findOne.mockResolvedValue({ ...lastAdminStaff });
      mockActiveAdminCount(0);

      await expect(
        service.update('staff-admin', { isActive: false }, hospitalAdmin),
      ).rejects.toThrow(/Invite a replacement administrator first/);

      expect(staffRepo.save).not.toHaveBeenCalled();
      expect(clerkAdmin.deactivateUser).not.toHaveBeenCalled();
    });

    it('rejects demoting the last active hospital_admin', async () => {
      staffRepo.findOne.mockResolvedValue({ ...lastAdminStaff });
      mockActiveAdminCount(0);

      await expect(
        service.update('staff-admin', { roleSlug: 'doctor' }, hospitalAdmin),
      ).rejects.toThrow(/Invite a replacement administrator first/);

      expect(userRolesRepo.delete).not.toHaveBeenCalled();
    });

    it('does not treat super_admin as filling the hospital_admin slot', async () => {
      staffRepo.findOne.mockResolvedValue({ ...lastAdminStaff });
      mockActiveAdminCount(0);

      await expect(service.remove('staff-admin', superAdmin)).rejects.toThrow(
        /Invite a replacement administrator first/,
      );
    });
  });

  describe('hospital_admin replacement invite', () => {
    it('rejects hospital_admin invite from hospital_manager', async () => {
      await expect(
        service.create(
          'hospital-a',
          {
            email: 'new-admin@hospital.com',
            fullName: 'New Admin',
            roleSlug: 'hospital_admin',
          },
          hospitalManager,
        ),
      ).rejects.toThrow(/cannot be assigned via staff invite/);

      expect(rolesRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects hospital_admin invite when an active hospital_admin exists', async () => {
      mockActiveAdminCount(1);

      await expect(
        service.create(
          'hospital-a',
          {
            email: 'new-admin@hospital.com',
            fullName: 'New Admin',
            roleSlug: 'hospital_admin',
          },
          hospitalAdmin,
        ),
      ).rejects.toThrow(/already has an active hospital_admin/);

      expect(staffRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('allows hospital_admin invite when there are zero active hospital_admins', async () => {
      mockActiveAdminCount(0);
      rolesRepo.findOne.mockResolvedValue({
        id: 'role-admin',
        slug: 'hospital_admin',
      });
      usersRepo.create.mockImplementation((row: unknown) => row);
      usersRepo.save.mockResolvedValue({
        id: 'user-new',
        hospitalId: 'hospital-a',
      });
      staffRepo.findOne.mockResolvedValueOnce(null).mockResolvedValue({
        id: 'staff-new',
        userId: 'user-new',
        hospitalId: 'hospital-a',
        user: {
          fullName: 'New Admin',
          email: 'new-admin@hospital.com',
          userRoles: [{ role: { slug: 'hospital_admin' } }],
        },
      });
      staffRepo.create.mockImplementation((row: unknown) => row);
      staffRepo.save.mockResolvedValue({ id: 'staff-new' });
      userRolesRepo.findOne.mockResolvedValue(null);
      userRolesRepo.create.mockImplementation((row: unknown) => row);
      invitesRepo.create.mockImplementation((row: unknown) => row);
      invitesRepo.save.mockResolvedValue({});
      const { query } = mockCreateTransaction(null);

      await service.create(
        'hospital-a',
        {
          email: 'new-admin@hospital.com',
          fullName: 'New Admin',
          roleSlug: 'hospital_admin',
        },
        superAdmin,
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_roles'),
        ['hospital-a'],
      );
      expect(userRolesRepo.save).toHaveBeenCalled();
    });
  });
});
