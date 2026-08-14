import { Field, Float, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PatientType } from '../patients/patients.types';
import { UserSummaryType } from '../users/users.types';
import { LAB_ORDER_STATUSES } from '../database/entities/lab-order.entity';

export const LAB_ORDER_STATUS_VALUES = LAB_ORDER_STATUSES;

@ObjectType()
export class VitalSignType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => ID, { nullable: true })
  admissionId?: string;

  @Field(() => ID, { nullable: true })
  recordedById?: string;

  @Field({ nullable: true })
  bloodPressure?: string;

  @Field(() => Int, { nullable: true })
  heartRate?: number;

  @Field(() => Float, { nullable: true })
  temperature?: number;

  @Field(() => Int, { nullable: true })
  spo2?: number;

  @Field(() => Float, { nullable: true })
  weight?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  recordedAt: Date;
}

@ObjectType()
export class DiagnosisType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => ID, { nullable: true })
  admissionId?: string;

  @Field(() => ID, { nullable: true })
  doctorId?: string;

  @Field({ nullable: true })
  icdCode?: string;

  @Field()
  description: string;

  @Field()
  isPrimary: boolean;

  @Field()
  diagnosedAt: Date;
}

@ObjectType()
export class ClinicalNoteType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => ID, { nullable: true })
  admissionId?: string;

  @Field(() => ID, { nullable: true })
  authorId?: string;

  @Field({ nullable: true })
  subjective?: string;

  @Field({ nullable: true })
  objective?: string;

  @Field({ nullable: true })
  assessment?: string;

  @Field({ nullable: true })
  plan?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PrescriptionItemType {
  @Field(() => ID)
  id: string;

  @Field()
  drugName: string;

  @Field({ nullable: true })
  dosage?: string;

  @Field({ nullable: true })
  frequency?: string;

  @Field({ nullable: true })
  duration?: string;

  @Field({ nullable: true })
  instructions?: string;
}

@ObjectType()
export class PrescriptionType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => ID, { nullable: true })
  admissionId?: string;

  @Field(() => ID, { nullable: true })
  doctorId?: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => [PrescriptionItemType])
  items: PrescriptionItemType[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// Declared before LabOrderType: `emitDecoratorMetadata` emits an eager
// `design:type` reference to LabResultType for LabOrderType.result, so the
// class must exist first to avoid a temporal-dead-zone ReferenceError at load.
@ObjectType()
export class LabResultType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  labOrderId: string;

  @Field(() => ID)
  hospitalId: string;

  @Field({ nullable: true })
  resultValue?: string;

  @Field({ nullable: true })
  referenceRange?: string;

  @Field({ nullable: true })
  unit?: string;

  @Field({ nullable: true })
  resultFileUrl?: string;

  @Field(() => ID, { nullable: true })
  enteredById?: string;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class LabOrderType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => PatientType, { nullable: true })
  patient?: PatientType;

  @Field(() => ID, { nullable: true })
  admissionId?: string;

  @Field(() => ID, { nullable: true })
  orderedById?: string;

  @Field(() => UserSummaryType, { nullable: true })
  orderedBy?: UserSummaryType;

  @Field()
  testName: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => LabResultType, { nullable: true })
  result?: LabResultType;
}

@InputType()
export class CreateVitalInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  heartRate?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  temperature?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  spo2?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  weight?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  height?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class CreateDiagnosisInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  icdCode?: string;

  @Field()
  @IsString()
  @MinLength(1)
  description: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

@InputType()
export class CreateClinicalNoteInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  subjective?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  objective?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assessment?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  plan?: string;
}

@InputType()
export class PrescriptionItemInput {
  @Field()
  @IsString()
  @MinLength(1)
  drugName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dosage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  frequency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  duration?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  instructions?: string;
}

@InputType()
export class CreatePrescriptionInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => [PrescriptionItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInput)
  items: PrescriptionItemInput[];
}

@InputType()
export class CreateLabOrderInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @Field()
  @IsString()
  @MinLength(1)
  testName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class CompleteLabResultInput {
  @Field()
  @IsUUID()
  labOrderId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  resultValue?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  resultFileUrl?: string;
}

@InputType()
export class UpdateLabOrderStatusInput {
  @Field()
  @IsUUID()
  labOrderId: string;

  @Field()
  @IsIn([...LAB_ORDER_STATUS_VALUES])
  status: string;
}

@InputType()
export class CancelPrescriptionInput {
  @Field()
  @IsUUID()
  prescriptionId: string;
}
