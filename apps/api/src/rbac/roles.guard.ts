import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PERMISSIONS_ANY_KEY } from './permissions-any.decorator';
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

    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const user = this.getUser(context);

    // Explicit bootstrap / invite paths: any authenticated JWT, service enforces.
    if (allowAuthenticated) {
      return !!user;
    }

    // Fail closed: handlers must declare @Roles, @Permissions, @PermissionsAny,
    // or @AllowAuthenticated.
    if (
      !requiredRoles?.length &&
      !requiredPermissions?.length &&
      !requiredAnyPermissions?.length
    ) {
      return false;
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

    if (requiredAnyPermissions?.length) {
      const hasAny = requiredAnyPermissions.some((perm) =>
        user.permissions.includes(perm),
      );
      if (!hasAny) return false;
    }

    return true;
  }

  /** Resolve the authenticated user from HTTP or GraphQL context (#240). */
  private getUser(context: ExecutionContext): AuthenticatedUser | undefined {
    if (context.getType<string>() === 'http') {
      const req = context
        .switchToHttp()
        .getRequest<{ user?: AuthenticatedUser }>();
      return req?.user;
    }

    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<{ req: { user?: AuthenticatedUser } }>();
    return gqlContext.req?.user;
  }
}
