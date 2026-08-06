import { SetMetadata } from '@nestjs/common';

/**
 * Marks a handler as intentionally JWT-only (no role/permission metadata).
 * RolesGuard still requires an authenticated user instead of fail-opening
 * silently when decorators are omitted (#201, #208).
 */
export const ALLOW_AUTHENTICATED_KEY = 'allowAuthenticated';
export const AllowAuthenticated = () =>
  SetMetadata(ALLOW_AUTHENTICATED_KEY, true);
