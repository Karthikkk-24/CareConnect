import { PERMISSIONS, type PermissionSlug } from '@careconnect/types';

export function hasPermission(
  permissions: string[] | undefined | null,
  required: PermissionSlug | PermissionSlug[],
): boolean {
  if (!permissions?.length) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => permissions.includes(p));
}

export function hasAnyRole(
  roles: string[] | undefined | null,
  required: string | string[],
): boolean {
  if (!roles?.length) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.some((r) => roles.includes(r));
}

/** Staff roles that should use the dashboard, not portal-only bounce. */
export const STAFF_ROLES = [
  'super_admin',
  'hospital_admin',
  'hospital_manager',
  'doctor',
  'nurse',
  'receptionist',
  'lab_technician',
  'pharmacist',
  'accountant',
] as const;

export function isPatientOnly(roles: string[] | undefined | null): boolean {
  if (!roles?.length) return false;
  const hasPatient = roles.includes('patient');
  if (!hasPatient) return false;
  return !roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
}

export { PERMISSIONS };
