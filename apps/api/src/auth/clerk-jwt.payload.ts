import type { JwtPayload } from './auth.types';

export interface ClerkJwtPayload extends JwtPayload {
  email?: string;
  email_address?: string;
  primary_email_address?: string;
  primary_email_address_id?: string;
  email_verified?: boolean | string;
  email_addresses?: Array<{
    id?: string;
    email_address?: string;
    verification?: { status?: string };
  }>;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  org_id?: string;
  org_slug?: string;
  org_role?: string;
}

export function extractEmail(payload: ClerkJwtPayload): string | undefined {
  if (payload.email) return payload.email;
  if (payload.email_address) return payload.email_address;
  if (payload.primary_email_address) return payload.primary_email_address;

  const list = payload.email_addresses;
  if (Array.isArray(list) && list.length > 0) {
    const primaryId = payload.primary_email_address_id;
    const primary =
      (primaryId ? list.find((entry) => entry?.id === primaryId) : undefined) ??
      list[0];
    if (primary?.email_address) return primary.email_address;
  }

  return undefined;
}

/** Fail closed: missing or unrecognized claims are unverified. */
export function isEmailVerified(payload: ClerkJwtPayload): boolean {
  if (payload.email_verified === true || payload.email_verified === 'true') {
    return true;
  }
  if (payload.email_verified === false || payload.email_verified === 'false') {
    return false;
  }

  const email = extractEmail(payload);
  const list = payload.email_addresses;
  if (!email || !Array.isArray(list)) return false;

  const matched = list.find(
    (entry) =>
      typeof entry?.email_address === 'string' &&
      entry.email_address.toLowerCase() === email.toLowerCase(),
  );
  return matched?.verification?.status === 'verified';
}
