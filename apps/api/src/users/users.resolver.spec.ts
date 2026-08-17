import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UsersResolver } from './users.resolver';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  const authService = {
    completeOnboarding: jest.fn(),
    completePatientOnboarding: jest.fn(),
    syncAndGetUser: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'admin@hospital.com',
    fullName: 'Admin',
    hospitalId: 'hospital-a',
    hospitalActive: true,
    roles: ['hospital_admin'],
    permissions: ['patients:read'],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();
    resolver = module.get(UsersResolver);
  });

  it('reports hospitalActive from AuthService without fail-open default', () => {
    expect(resolver.me(user).hospitalActive).toBe(true);
    expect(resolver.me({ ...user, hospitalActive: false }).hospitalActive).toBe(
      false,
    );
  });

  it('treats missing hospitalActive as inactive', () => {
    expect(
      resolver.me({ ...user, hospitalActive: undefined }).hospitalActive,
    ).toBe(false);
  });
});
