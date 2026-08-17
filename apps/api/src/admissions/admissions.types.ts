import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PatientType } from '../patients/patients.types';
import { BedType, WardType } from '../facility/facility.types';
import { UserSummaryType } from '../users/users.types';

@ObjectType()
export class AdmissionType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => PatientType, { nullable: true })
  patient?: PatientType;

  @Field(() => ID, { nullable: true })
  attendingDoctorId?: string;

  @Field(() => UserSummaryType, { nullable: true })
  attendingDoctor?: UserSummaryType;

  @Field(() => ID, { nullable: true })
  wardId?: string;

  @Field(() => WardType, { nullable: true })
  ward?: WardType;

  @Field(() => ID, { nullable: true })
  bedId?: string;

  @Field(() => BedType, { nullable: true })
  bed?: BedType;

  @Field()
  admittedAt: Date;

  @Field({ nullable: true })
  dischargedAt?: Date;

  @Field({ nullable: true })
  reason?: string;

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class WardOccupancyType {
  @Field(() => ID)
  wardId: string;

  @Field()
  wardName: string;

  @Field(() => Int)
  totalBeds: number;

  @Field(() => Int)
  occupiedBeds: number;

  @Field(() => Int)
  availableBeds: number;
}

@InputType()
export class AdmitPatientInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  attendingDoctorId?: string;

  @Field()
  @IsUUID()
  wardId: string;

  @Field()
  @IsUUID()
  bedId: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

@InputType()
export class DischargeAdmissionInput {
  @Field()
  @IsUUID()
  id: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}

@InputType()
export class TransferAdmissionInput {
  @Field()
  @IsUUID()
  admissionId: string;

  @Field()
  @IsUUID()
  wardId: string;

  @Field()
  @IsUUID()
  bedId: string;
}

@InputType()
export class TransferOutAdmissionInput {
  @Field()
  @IsUUID()
  admissionId: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
