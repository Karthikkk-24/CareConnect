import { Field, Float, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PrescriptionItemType } from '../clinical/clinical.types';
import { PatientType } from '../patients/patients.types';

@ObjectType()
export class PharmacyStockType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field()
  drugName: string;

  @Field(() => Float)
  quantity: number;

  @Field()
  unit: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PendingPrescriptionType {
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

@ObjectType()
export class PendingPrescriptionsPageType {
  @Field(() => [PendingPrescriptionType])
  items: PendingPrescriptionType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field()
  hasMore: boolean;
}

@InputType()
export class UpsertPharmacyStockInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  drugName: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  quantity: number;

  /** When set on update, must match the locked row quantity (optimistic concurrency). */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedQuantity?: number;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;
}

@InputType()
export class DispensePrescriptionInput {
  @Field()
  @IsUUID()
  prescriptionId: string;
}
