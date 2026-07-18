import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

@ObjectType()
export class AdmissionType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => ID, { nullable: true })
  attendingDoctorId?: string;

  @Field(() => ID, { nullable: true })
  wardId?: string;

  @Field(() => ID, { nullable: true })
  bedId?: string;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}
