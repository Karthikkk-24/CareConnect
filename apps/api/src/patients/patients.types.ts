import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';

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
  @Field()
  name: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  relationship?: string;
}

@InputType()
export class PatientInsuranceInput {
  @Field({ nullable: true })
  provider?: string;

  @Field({ nullable: true })
  policyNumber?: string;

  @Field({ nullable: true })
  groupNumber?: string;
}

@InputType()
export class PatientAllergyInput {
  @Field()
  allergen: string;

  @Field({ nullable: true })
  severity?: string;

  @Field({ nullable: true })
  reaction?: string;

  @Field({ nullable: true })
  notes?: string;
}

@InputType()
export class PatientMedicationInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  dosage?: string;

  @Field({ nullable: true })
  frequency?: string;

  @Field({ nullable: true })
  prescriber?: string;
}

@InputType()
export class MedicalHistoryInput {
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
}

@InputType()
export class PatientConsentInput {
  @Field()
  consentType: string;

  @Field()
  granted: boolean;
}

@InputType()
export class CreatePatientInput {
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

  @Field(() => [EmergencyContactInput], { nullable: true })
  emergencyContacts?: EmergencyContactInput[];

  @Field(() => PatientInsuranceInput, { nullable: true })
  insurance?: PatientInsuranceInput;

  @Field(() => [PatientAllergyInput], { nullable: true })
  allergies?: PatientAllergyInput[];

  @Field(() => [PatientMedicationInput], { nullable: true })
  medications?: PatientMedicationInput[];

  @Field(() => [MedicalHistoryInput], { nullable: true })
  medicalHistory?: MedicalHistoryInput[];

  @Field(() => [PatientConsentInput], { nullable: true })
  consents?: PatientConsentInput[];
}

@InputType()
export class BulkPatientRowInput {
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
  emergencyContactName?: string;

  @Field({ nullable: true })
  emergencyContactPhone?: string;

  @Field({ nullable: true })
  insuranceProvider?: string;

  @Field({ nullable: true })
  insurancePolicyNumber?: string;

  @Field({ nullable: true })
  allergies?: string;

  @Field({ nullable: true })
  identificationType?: string;

  @Field({ nullable: true })
  identificationNumber?: string;
}

@InputType()
export class PatientDocumentInput {
  @Field()
  name: string;

  @Field()
  fileUrl: string;

  @Field({ nullable: true })
  fileType?: string;

  @Field({ nullable: true })
  documentType?: string;
}
