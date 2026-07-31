import { ROLES, type RoleSlug } from '@careconnect/types';

/** Staff roles allowed on hospital-scoped operational GraphQL APIs. */
export const STAFF_ROLES: RoleSlug[] = [
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.LAB_TECHNICIAN,
  ROLES.PHARMACIST,
  ROLES.ACCOUNTANT,
];
