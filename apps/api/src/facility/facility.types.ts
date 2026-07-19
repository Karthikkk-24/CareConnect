import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

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
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class CreateWardInput {
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

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

  @Field()
  @IsString()
  @MinLength(1)
  label: string;
}

@InputType()
export class UpdateDepartmentInput {
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class UpdateWardInput {
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  floor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

@InputType()
export class UpdateBedInput {
  @Field()
  @IsString()
  @MinLength(1)
  label: string;
}
