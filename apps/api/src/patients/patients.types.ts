import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const PATIENT_GENDERS = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
] as const;
const PATIENT_STATUSES = [
  'registered',
  'checked_in',
  'admitted',
  'discharged',
  'inactive',
] as const;

@ObjectType()
export class PatientType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field()
  fullName: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  dateOfBirth?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  bloodGroup?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  zipCode?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  occupation?: string;

  @Field({ nullable: true })
  identificationType?: string;

  @Field({ nullable: true })
  identificationNumber?: string;

  @Field({ nullable: true })
  primaryCarePhysician?: string;

  @Field()
  status: string;

  @Field(() => ID, { nullable: true })
  userId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class EmergencyContactType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  relationship?: string;
}

@ObjectType()
export class MedicalHistoryType {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  condition: string;

  @Field({ nullable: true })
  diagnosisDate?: string;

  @Field({ nullable: true })
  relation?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PatientDocumentType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  fileUrl: string;

  @Field({ nullable: true })
  fileType?: string;

  @Field({ nullable: true })
  documentType?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PatientConsentType {
  @Field(() => ID)
  id: string;

  @Field()
  consentType: string;

  @Field()
  granted: boolean;

  @Field({ nullable: true })
  grantedAt?: Date;
}

@ObjectType()
export class PatientDetailType extends PatientType {
  @Field(() => [EmergencyContactType])
  emergencyContacts: EmergencyContactType[];

  @Field({ nullable: true })
  insuranceProvider?: string;

  @Field({ nullable: true })
  insurancePolicyNumber?: string;

  @Field(() => [String])
  allergies: string[];

  @Field(() => [String])
  medications: string[];

  @Field(() => [MedicalHistoryType])
  medicalHistory: MedicalHistoryType[];

  @Field(() => [PatientDocumentType])
  documents: PatientDocumentType[];

  @Field(() => [PatientConsentType])
  consents: PatientConsentType[];
}

@ObjectType()
export class PatientsPageType {
  @Field(() => [PatientType])
  items: PatientType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}

@ObjectType()
export class ImportRowErrorType {
  @Field(() => Int)
  row: number;

  @Field()
  message: string;
}

@ObjectType()
export class BulkImportResultType {
  @Field(() => Int)
  totalRows: number;

  @Field(() => Int)
  successCount: number;

  @Field(() => Int)
  errorCount: number;

  @Field(() => [ImportRowErrorType])
  errors: ImportRowErrorType[];

  @Field()
  dryRun: boolean;
}

@InputType()
export class EmergencyContactInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @MaxLength(50)
  @Field()
  @IsString()
  @MinLength(1)
  phone: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  relationship?: string;
}

@InputType()
export class PatientInsuranceInput {
  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  provider?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupNumber?: string;
}

@InputType()
export class PatientAllergyInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  allergen: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  severity?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reaction?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class PatientMedicationInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dosage?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  frequency?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  prescriber?: string;
}

@InputType()
export class MedicalHistoryInput {
  @Field()
  @IsString()
  @IsIn(['past', 'family', 'surgical'])
  type: string;

  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  condition: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  diagnosisDate?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  relation?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class PatientConsentInput {
  @Field()
  @IsString()
  @IsIn(['treatment', 'data_sharing', 'research'])
  consentType: string;

  @Field()
  @IsBoolean()
  granted: boolean;
}

@InputType()
export class CreatePatientInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(2)
  fullName: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsIn([...PATIENT_GENDERS])
  gender?: string;

  @MaxLength(10)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  occupation?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  identificationType?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  primaryCarePhysician?: string;

  @Field(() => [EmergencyContactInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactInput)
  emergencyContacts?: EmergencyContactInput[];

  @Field(() => PatientInsuranceInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientInsuranceInput)
  insurance?: PatientInsuranceInput;

  @Field(() => [PatientAllergyInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAllergyInput)
  allergies?: PatientAllergyInput[];

  @Field(() => [PatientMedicationInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientMedicationInput)
  medications?: PatientMedicationInput[];

  @Field(() => [MedicalHistoryInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalHistoryInput)
  medicalHistory?: MedicalHistoryInput[];

  @Field(() => [PatientConsentInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientConsentInput)
  consents?: PatientConsentInput[];
}

@InputType()
export class UpdatePatientInput {
  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsIn([...PATIENT_GENDERS])
  gender?: string;

  @MaxLength(10)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  occupation?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  identificationType?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  primaryCarePhysician?: string;

  @Field(() => [EmergencyContactInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactInput)
  emergencyContacts?: EmergencyContactInput[];

  @Field(() => PatientInsuranceInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientInsuranceInput)
  insurance?: PatientInsuranceInput;

  @Field(() => [PatientAllergyInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAllergyInput)
  allergies?: PatientAllergyInput[];

  @Field(() => [PatientMedicationInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientMedicationInput)
  medications?: PatientMedicationInput[];

  @Field(() => [MedicalHistoryInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalHistoryInput)
  medicalHistory?: MedicalHistoryInput[];

  @Field(() => [PatientConsentInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientConsentInput)
  consents?: PatientConsentInput[];
}

@InputType()
export class BulkPatientRowInput {
  @MaxLength(255)
  @Field()
  fullName: string;

  @MaxLength(255)
  @Field({ nullable: true })
  email?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  phone?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  dateOfBirth?: string;

  @MaxLength(20)
  @Field({ nullable: true })
  gender?: string;

  @MaxLength(10)
  @Field({ nullable: true })
  bloodGroup?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  address?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  city?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  emergencyContactName?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  emergencyContactPhone?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  insuranceProvider?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  insurancePolicyNumber?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  allergies?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  identificationType?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  identificationNumber?: string;
}

@InputType()
export class PatientDocumentInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @MaxLength(500)
  @Field()
  @IsString()
  @MinLength(1)
  fileUrl: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fileType?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  documentType?: string;
}

export { PATIENT_STATUSES };
