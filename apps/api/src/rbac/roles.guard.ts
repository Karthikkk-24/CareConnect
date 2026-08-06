import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { ALLOW_AUTHENTICATED_KEY } from './allow-authenticated.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RoleSlug } from '@careconnect/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleSlug[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<{ req: { user?: AuthenticatedUser } }>();
    const user = gqlContext.req?.user;

    // Explicit bootstrap / invite paths: any authenticated JWT, service enforces.
    if (allowAuthenticated) {
      return !!user;
    }

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    if (!user) return false;

    if (user.roles.includes('super_admin')) return true;

    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some((role) => user.roles.includes(role));
      if (!hasRole) return false;
    }

    if (requiredPermissions?.length) {
      const hasPermission = requiredPermissions.every((perm) =>
        user.permissions.includes(perm),
      );
      if (!hasPermission) return false;
    }

    return true;
  }
}
