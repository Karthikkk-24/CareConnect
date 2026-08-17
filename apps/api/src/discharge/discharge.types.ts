import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FOLLOW_UP_STATUSES } from '../database/entities/follow-up.entity';

@ObjectType()
export class DischargeType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  admissionId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => ID, { nullable: true })
  dischargedById?: string;

  @Field({ nullable: true })
  summary?: string;

  @Field({ nullable: true })
  medicationsAtDischarge?: string;

  @Field({ nullable: true })
  instructions?: string;

  @Field()
  dischargedAt: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class FollowUpType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field({ nullable: true })
  patientName?: string;

  @Field(() => ID, { nullable: true })
  dischargeId?: string;

  @Field(() => ID, { nullable: true })
  doctorId?: string;

  @Field({ nullable: true })
  doctorName?: string;

  @Field()
  scheduledAt: Date;

  @Field({ nullable: true })
  type?: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class FollowUpsPageType {
  @Field(() => [FollowUpType])
  items: FollowUpType[];

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
export class CreateDischargeInput {
  @Field()
  @IsUUID()
  admissionId: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  summary?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  medicationsAtDischarge?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  instructions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  followUpScheduledAt?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  followUpType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  followUpDoctorId?: string;
}

@InputType()
export class CreateFollowUpInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  dischargeId?: string;

  @Field()
  @IsUUID()
  doctorId: string;

  @Field()
  @IsDateString()
  scheduledAt: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  type?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class UpdateFollowUpStatusInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsString()
  @IsIn([...FOLLOW_UP_STATUSES])
  status: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}

@InputType()
export class RescheduleFollowUpInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsDateString()
  scheduledAt: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}

export { FOLLOW_UP_STATUSES };
