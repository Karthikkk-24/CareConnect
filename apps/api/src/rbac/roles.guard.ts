import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RoleSlug } from '@careconnect/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleSlug[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as AuthenticatedUser | undefined;

    if (!user) return false;

    if (user.roles.includes('super_admin')) return true;

    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some((role) => user.roles.includes(role));
      if (!hasRole) return false;
    }

    if (requiredPermissions?.length) {
      const hasPermission = requiredPermissions.every((perm) => user.permissions.includes(perm));
      if (!hasPermission) return false;
    }

    return true;
  }
}
