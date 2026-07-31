import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role, User, UserRole, Hospital } from '../database/entities';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const manager = {
    query: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => data),
  };

  const usersRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
  };

  const userRolesRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  };

  const rolesRepo = {
    findOne: jest.fn(),
  };

  const hospitalsRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    manager.query.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(UserRole), useValue: userRolesRepo },
        { provide: getRepositoryToken(Role), useValue: rolesRepo },
        { provide: getRepositoryToken(Hospital), useValue: hospitalsRepo },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  const actor: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'founder@hospital.com',
    fullName: 'Founder',
    roles: [],
    permissions: [],
    onboardingCompleted: false,
  };

  describe('syncAndGetUser', () => {
    it('rejects inactive users', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        email: 'inactive@hospital.com',
        fullName: 'Inactive User',
        isActive: false,
        userRoles: [],
      });

      await expect(
        service.syncAndGetUser('auth-1', 'inactive@hospital.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.syncAndGetUser('auth-1', 'inactive@hospital.com'),
      ).rejects.toThrow('Account is deactivated');
    });

    it('returns authenticated user when active', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        email: 'active@hospital.com',
        fullName: 'Active User',
        hospitalId: 'hospital-1',
        isActive: true,
        onboardingCompleted: true,
        userRoles: [
          {
            hospitalId: 'hospital-1',
            role: {
              slug: 'hospital_admin',
              permissions: [{ slug: 'patients:read' }],
            },
          },
        ],
      });

      const result = await service.syncAndGetUser(
        'auth-1',
        'active@hospital.com',
      );

      expect(result).toEqual({
        id: 'user-1',
        authId: 'auth-1',
        email: 'active@hospital.com',
        fullName: 'Active User',
        hospitalId: 'hospital-1',
        roles: ['hospital_admin'],
        permissions: ['patients:read'],
        onboardingCompleted: true,
      });
    });
  });

  describe('toAuthenticatedUser', () => {
    it('filters out roles from a different hospital', () => {
      const result = service.toAuthenticatedUser({
        id: 'user-1',
        authId: 'auth-1',
        email: 'doc@hospital.com',
        fullName: 'Doc',
        hospitalId: 'hospital-a',
        isActive: true,
        onboardingCompleted: true,
        userRoles: [
          {
            hospitalId: 'hospital-a',
            role: {
              slug: 'nurse',
              permissions: [{ slug: 'patients:read' }],
            },
          },
          {
            hospitalId: 'hospital-b',
            role: {
              slug: 'doctor',
              permissions: [
                { slug: 'patients:write' },
                { slug: 'appointments:write' },
              ],
            },
          },
        ],
      } as User);

      expect(result.roles).toEqual(['nurse']);
      expect(result.permissions).toEqual(['patients:read']);
    });

    it('keeps platform roles regardless of hospital scope', () => {
      const result = service.toAuthenticatedUser({
        id: 'user-1',
        authId: 'auth-1',
        email: 'admin@careconnect.com',
        fullName: 'Super',
        hospitalId: 'hospital-a',
        isActive: true,
        onboardingCompleted: true,
        userRoles: [
          {
            hospitalId: undefined,
            role: {
              slug: 'super_admin',
              permissions: [{ slug: 'hospitals:write' }],
            },
          },
          {
            hospitalId: 'hospital-b',
            role: {
              slug: 'doctor',
              permissions: [{ slug: 'patients:write' }],
            },
          },
        ],
      } as User);

      expect(result.roles).toEqual(['super_admin']);
      expect(result.permissions).toEqual(['hospitals:write']);
    });
  });

  describe('completeOnboarding bootstrap', () => {
    it('takes an advisory lock and assigns hospital_admin when none exist', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        hospitalId: undefined,
      });
      hospitalsRepo.findOne.mockResolvedValue({ id: 'hospital-a' });
      manager.findOne.mockResolvedValue({
        id: 'role-admin',
        slug: 'hospital_admin',
      });
      manager.count.mockResolvedValue(0);
      manager.find.mockResolvedValue([]);

      await service.completeOnboarding(actor, 'Founder', 'hospital-a', true);

      expect(manager.query).toHaveBeenCalledWith(
        `SELECT pg_advisory_xact_lock(hashtext($1::text))`,
        ['hospital-admin-bootstrap:hospital-a'],
      );
      expect(manager.save).toHaveBeenCalled();
      expect(manager.update).toHaveBeenCalledWith(
        User,
        'user-1',
        expect.objectContaining({
          hospitalId: 'hospital-a',
          onboardingCompleted: true,
        }),
      );
    });

    it('rejects bootstrap when an admin already exists under the lock', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        hospitalId: undefined,
      });
      hospitalsRepo.findOne.mockResolvedValue({ id: 'hospital-a' });
      manager.findOne.mockResolvedValue({
        id: 'role-admin',
        slug: 'hospital_admin',
      });
      manager.count.mockResolvedValue(1);

      await expect(
        service.completeOnboarding(actor, 'Founder', 'hospital-a', true),
      ).rejects.toThrow(ForbiddenException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
