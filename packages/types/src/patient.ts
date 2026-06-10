import { z } from 'zod';

export const patientGenderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

export const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Contact phone is required'),
  relationship: z.string().optional(),
});

export const patientInsuranceSchema = z.object({
  provider: z.string().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
});

export const patientAllergySchema = z.object({
  allergen: z.string().min(1),
  severity: z.string().optional(),
  reaction: z.string().optional(),
  notes: z.string().optional(),
});

export const patientMedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescriber: z.string().optional(),
});

export const medicalHistorySchema = z.object({
  type: z.enum(['past', 'family', 'surgical']),
  condition: z.string().min(1),
  diagnosisDate: z.string().optional(),
  relation: z.string().optional(),
  notes: z.string().optional(),
});

export const patientConsentSchema = z.object({
  consentType: z.enum(['treatment', 'data_sharing', 'research']),
  granted: z.boolean(),
});

export const createPatientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: patientGenderSchema.optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  occupation: z.string().optional(),
  identificationType: z.string().optional(),
  identificationNumber: z.string().optional(),
  primaryCarePhysician: z.string().optional(),
  emergencyContacts: z.array(emergencyContactSchema).optional(),
  insurance: patientInsuranceSchema.optional(),
  allergies: z.array(patientAllergySchema).optional(),
  medications: z.array(patientMedicationSchema).optional(),
  medicalHistory: z.array(medicalHistorySchema).optional(),
  consents: z.array(patientConsentSchema).optional(),
});

export const bulkPatientRowSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  allergies: z.string().optional(),
  identificationType: z.string().optional(),
  identificationNumber: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type BulkPatientRow = z.infer<typeof bulkPatientRowSchema>;

export interface Patient {
  id: string;
  hospitalId: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  occupation?: string;
  identificationType?: string;
  identificationNumber?: string;
  primaryCarePhysician?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
