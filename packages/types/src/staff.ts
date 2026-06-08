import type { RoleSlug } from './roles';

export interface StaffMember {
  id: string;
  userId: string;
  hospitalId: string;
  fullName: string;
  email: string;
  phone?: string;
  roleSlug: RoleSlug;
  department?: string;
  specialization?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}
