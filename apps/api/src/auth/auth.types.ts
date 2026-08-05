import type { RoleSlug } from '@careconnect/types';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  azp?: string;
  exp?: number;
  iat?: number;
}

export interface AuthenticatedUser {
  id: string;
  authId: string;
  email: string;
  fullName: string;
  hospitalId?: string;
  /** False when the user's bound hospital is deactivated. */
  hospitalActive?: boolean;
  roles: RoleSlug[];
  permissions: string[];
  onboardingCompleted: boolean;
}
