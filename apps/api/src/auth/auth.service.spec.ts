import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role, User, UserRole, Hospital } from '../database/entities';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
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
});
