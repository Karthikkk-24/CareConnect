import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Manual bed updates only allow available ↔ maintenance (occupied is admit/discharge). */
export const MANUAL_BED_STATUSES = ['available', 'maintenance'] as const;

@ObjectType()
export class DepartmentType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class WardType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID, { nullable: true })
  departmentId?: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  floor?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class BedType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  wardId: string;

  @Field()
  label: string;

  @Field()
  status: string;

  @Field()
  createdAt: Date;
}

@InputType()
export class CreateDepartmentInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class CreateWardInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  floor?: string;
}

@InputType()
export class CreateBedInput {
  @Field()
  @IsUUID()
  wardId: string;

  @MaxLength(50)
  @Field()
  @IsString()
  @MinLength(1)
  label: string;
}

@InputType()
export class UpdateBedStatusInput {
  @Field()
  @IsUUID()
  bedId: string;

  @Field()
  @IsIn([...MANUAL_BED_STATUSES])
  status: string;
}
