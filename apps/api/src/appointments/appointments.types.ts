import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { APPOINTMENT_STATUSES } from '../database/entities/appointment.entity';
import { PatientType } from '../patients/patients.types';
import { UserSummaryType } from '../users/users.types';

@ObjectType()
export class AppointmentType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => PatientType, { nullable: true })
  patient?: PatientType;

  @Field(() => ID, { nullable: true })
  doctorId?: string;

  @Field(() => UserSummaryType, { nullable: true })
  doctor?: UserSummaryType;

  @Field(() => ID, { nullable: true })
  departmentId?: string;

  @Field()
  scheduledAt: Date;

  @Field({ nullable: true })
  reason?: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => ID, { nullable: true })
  createdById?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateAppointmentInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @Field()
  @IsDateString()
  scheduledAt: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class UpdateAppointmentStatusInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsString()
  @IsIn([...APPOINTMENT_STATUSES])
  status: string;
}

@InputType()
export class CancelAppointmentInput {
  @Field()
  @IsUUID()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}

@InputType()
export class RescheduleAppointmentInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsDateString()
  scheduledAt: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

export { APPOINTMENT_STATUSES };
