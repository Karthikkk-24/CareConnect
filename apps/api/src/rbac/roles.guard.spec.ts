import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PERMISSIONS_ANY_KEY } from './permissions-any.decorator';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createGqlContext = (user?: AuthenticatedUser): ExecutionContext => {
    const gqlCtx = {
      getContext: () => ({ req: { user } }),
    };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(gqlCtx as never);

    return {
      getType: () => 'graphql',
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => {
          throw new Error('HTTP request should not be used for GraphQL');
        },
      }),
    } as unknown as ExecutionContext;
  };

  const createHttpContext = (user?: AuthenticatedUser): ExecutionContext => {
    return {
      getType: () => 'http',
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
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

  it('denies access when no roles or permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createGqlContext())).toBe(false);
  });

  it('requires an authenticated user when AllowAuthenticated is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'allowAuthenticated') return true;
      return undefined;
    });

    expect(guard.canActivate(createGqlContext())).toBe(false);
    expect(
      guard.canActivate(
        createGqlContext({
          id: 'u1',
          authId: 'a1',
          email: 'a@b.c',
          fullName: 'A',
          roles: [],
          permissions: [],
          onboardingCompleted: false,
        }),
      ),
    ).toBe(true);
  });

  it('denies access when user is missing', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return ['hospital_admin'];
        return undefined;
      });

    expect(guard.canActivate(createGqlContext())).toBe(false);
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

    expect(guard.canActivate(createGqlContext(user))).toBe(true);
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

    expect(guard.canActivate(createGqlContext(doctor))).toBe(true);
    expect(guard.canActivate(createGqlContext(nurse))).toBe(false);
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

    expect(guard.canActivate(createGqlContext(user))).toBe(false);

    user.permissions.push('patients:write');
    expect(guard.canActivate(createGqlContext(user))).toBe(true);
  });

  it('checks required any-permissions with OR semantics', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_ANY_KEY) {
          return ['patients:write', 'lab:write'];
        }
        return undefined;
      });

    const doctor: AuthenticatedUser = {
      id: '5',
      authId: 'auth-5',
      email: 'doc@hospital.com',
      fullName: 'Doctor',
      hospitalId: 'h-1',
      roles: ['doctor'],
      permissions: ['patients:write'],
      onboardingCompleted: true,
    };

    const labTech: AuthenticatedUser = {
      ...doctor,
      id: '6',
      roles: ['lab_technician'],
      permissions: ['lab:write'],
    };

    const receptionist: AuthenticatedUser = {
      ...doctor,
      id: '7',
      roles: ['receptionist'],
      permissions: ['appointments:write'],
    };

    expect(guard.canActivate(createGqlContext(doctor))).toBe(true);
    expect(guard.canActivate(createGqlContext(labTech))).toBe(true);
    expect(guard.canActivate(createGqlContext(receptionist))).toBe(false);
  });

  it('reads the user from HTTP request context for REST', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_ANY_KEY) {
          return ['patients:write', 'lab:write'];
        }
        return undefined;
      });

    const createSpy = jest.spyOn(GqlExecutionContext, 'create');

    const allowed: AuthenticatedUser = {
      id: '8',
      authId: 'auth-8',
      email: 'lab@hospital.com',
      fullName: 'Lab',
      hospitalId: 'h-1',
      roles: ['lab_technician'],
      permissions: ['lab:write'],
      onboardingCompleted: true,
    };

    expect(guard.canActivate(createHttpContext(allowed))).toBe(true);
    expect(guard.canActivate(createHttpContext())).toBe(false);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('denies patient role on staff-only hospital list endpoints', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) {
          return [
            'hospital_admin',
            'hospital_manager',
            'doctor',
            'nurse',
            'receptionist',
            'lab_technician',
            'pharmacist',
            'accountant',
          ];
        }
        if (key === PERMISSIONS_KEY) return ['billing:read'];
        return undefined;
      });

    const patient: AuthenticatedUser = {
      id: '4',
      authId: 'auth-4',
      email: 'patient@example.com',
      fullName: 'Patient',
      hospitalId: 'h-1',
      roles: ['patient'],
      permissions: ['billing:read', 'appointments:read'],
      onboardingCompleted: true,
    };

    expect(guard.canActivate(createGqlContext(patient))).toBe(false);
  });
});
