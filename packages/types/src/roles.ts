export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HOSPITAL_ADMIN: 'hospital_admin',
  HOSPITAL_MANAGER: 'hospital_manager',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RECEPTIONIST: 'receptionist',
  LAB_TECHNICIAN: 'lab_technician',
  PHARMACIST: 'pharmacist',
  ACCOUNTANT: 'accountant',
  PATIENT: 'patient',
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  HOSPITALS_READ: 'hospitals:read',
  HOSPITALS_WRITE: 'hospitals:write',
  STAFF_READ: 'staff:read',
  STAFF_WRITE: 'staff:write',
  PATIENTS_READ: 'patients:read',
  PATIENTS_WRITE: 'patients:write',
  APPOINTMENTS_READ: 'appointments:read',
  APPOINTMENTS_WRITE: 'appointments:write',
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
  REPORTS_READ: 'reports:read',
  ROLES_MANAGE: 'roles:manage',
  LAB_WRITE: 'lab:write',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface Role {
  id: string;
  slug: RoleSlug;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  slug: PermissionSlug;
  name: string;
  description?: string;
}
