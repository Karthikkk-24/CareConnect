import { SetMetadata } from '@nestjs/common';

/** Require ANY of the listed permissions (OR). Distinct from @Permissions AND. */
export const PERMISSIONS_ANY_KEY = 'permissionsAny';
export const PermissionsAny = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
