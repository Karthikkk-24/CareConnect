import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role, User, UserRole } from '../database/entities';
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
  };

  const rolesRepo = {
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

      await expect(service.syncAndGetUser('auth-1', 'inactive@hospital.com')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.syncAndGetUser('auth-1', 'inactive@hospital.com')).rejects.toThrow(
        'Account is deactivated',
      );
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
            role: {
              slug: 'hospital_admin',
              permissions: [{ slug: 'patients:read' }],
            },
          },
        ],
      });

      const result = await service.syncAndGetUser('auth-1', 'active@hospital.com');

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
});
