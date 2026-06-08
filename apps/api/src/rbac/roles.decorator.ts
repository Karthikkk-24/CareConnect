import { SetMetadata } from '@nestjs/common';
import type { RoleSlug } from '@careconnect/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleSlug[]) => SetMetadata(ROLES_KEY, roles);
