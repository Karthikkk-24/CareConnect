import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@ObjectType()
export class StaffType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  hospitalId: string;

  @Field()
  fullName: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  roleSlug: string;

  @Field({ nullable: true })
  department?: string;

  @Field({ nullable: true })
  specialization?: string;

  @Field({ nullable: true })
  employeeId?: string;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  inviteToken?: string;

  @Field({ nullable: true })
  inviteUrl?: string;

  @Field()
  createdAt: Date;
}

@InputType()
export class CreateStaffInput {
  @Field()
  @IsString()
  @MinLength(2)
  fullName: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field()
  @IsString()
  roleSlug: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  specialization?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string;
}

@InputType()
export class UpdateStaffInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fullName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  roleSlug?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  specialization?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
