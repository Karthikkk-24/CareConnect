import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createContext = (user?: AuthenticatedUser): ExecutionContext => {
    const gqlCtx = {
      getContext: () => ({ req: { user } }),
    };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(gqlCtx as never);

    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    jest.spyOn(reflector, 'getAllAndOverride');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows access when no roles or permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('denies access when user is missing', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return ['hospital_admin'];
        return undefined;
      });

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('allows super_admin regardless of required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return ['hospital_admin'];
        return undefined;
      });

    const user: AuthenticatedUser = {
      id: '1',
      authId: 'auth-1',
      email: 'super@careconnect.io',
      fullName: 'Super',
      roles: ['super_admin'],
      permissions: [],
      onboardingCompleted: true,
    };

    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it('checks required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return ['doctor'];
        return undefined;
      });

    const doctor: AuthenticatedUser = {
      id: '2',
      authId: 'auth-2',
      email: 'doc@hospital.com',
      fullName: 'Doctor',
      hospitalId: 'h-1',
      roles: ['doctor'],
      permissions: [],
      onboardingCompleted: true,
    };

    const nurse: AuthenticatedUser = { ...doctor, roles: ['nurse'] };

    expect(guard.canActivate(createContext(doctor))).toBe(true);
    expect(guard.canActivate(createContext(nurse))).toBe(false);
  });

  it('checks required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) return ['patients:read', 'patients:write'];
        return undefined;
      });

    const user: AuthenticatedUser = {
      id: '3',
      authId: 'auth-3',
      email: 'staff@hospital.com',
      fullName: 'Staff',
      hospitalId: 'h-1',
      roles: ['hospital_admin'],
      permissions: ['patients:read'],
      onboardingCompleted: true,
    };

    expect(guard.canActivate(createContext(user))).toBe(false);

    user.permissions.push('patients:write');
    expect(guard.canActivate(createContext(user))).toBe(true);
  });
});
