/** Roles that may discharge / transfer-out (matches API @Roles). */
export const DISCHARGE_ROLES = [
  'doctor',
  'nurse',
  'hospital_admin',
  'hospital_manager',
  'super_admin',
] as const;

/** Doctor + nurse + admins — notes, vitals, lab orders. */
export const CLINICAL_AUTHOR_ROLES = [
  'doctor',
  'nurse',
  'hospital_admin',
  'hospital_manager',
  'super_admin',
] as const;

/** Doctor + admins — diagnosis, prescriptions. */
export const CLINICIAN_ROLES = [
  'doctor',
  'hospital_admin',
  'hospital_manager',
  'super_admin',
] as const;

/** Admin roles for destructive / portal-link patient actions. */
export const PATIENT_ADMIN_ROLES = [
  'hospital_admin',
  'hospital_manager',
  'super_admin',
] as const;

export function hasAnyRole(
  roles: string[] | undefined,
  allowed: readonly string[],
): boolean {
  if (!roles?.length) return false;
  return allowed.some((role) => roles.includes(role));
}

export function canDischargePatients(roles: string[] | undefined): boolean {
  return hasAnyRole(roles, DISCHARGE_ROLES);
}

export function canAuthorClinical(roles: string[] | undefined): boolean {
  return hasAnyRole(roles, CLINICAL_AUTHOR_ROLES);
}

export function canActAsClinician(roles: string[] | undefined): boolean {
  return hasAnyRole(roles, CLINICIAN_ROLES);
}

export function canAdminPatients(roles: string[] | undefined): boolean {
  return hasAnyRole(roles, PATIENT_ADMIN_ROLES);
}

/** Roles that may schedule and update follow-ups (matches API @Roles). */
export const FOLLOW_UP_WRITE_ROLES = [
  'doctor',
  'nurse',
  'receptionist',
  'hospital_admin',
  'hospital_manager',
  'super_admin',
] as const;

export function canWriteFollowUps(roles: string[] | undefined): boolean {
  return hasAnyRole(roles, FOLLOW_UP_WRITE_ROLES);
}
