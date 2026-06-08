import { z } from 'zod';
import type { RoleSlug } from './roles';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    hospitalName: z.string().optional(),
    accountType: z.enum(['hospital', 'staff', 'patient']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.accountType !== 'hospital' || !!data.hospitalName?.trim(), {
    message: 'Hospital name is required',
    path: ['hospitalName'],
  });

export const staffSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  roleSlug: z.string(),
  department: z.string().optional(),
  specialization: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type StaffInput = z.infer<typeof staffSchema>;

export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  hospitalId?: string;
  roles: RoleSlug[];
  permissions: string[];
  onboardingCompleted: boolean;
}
