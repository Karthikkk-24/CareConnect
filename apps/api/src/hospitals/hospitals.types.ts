import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@ObjectType()
export class HospitalType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;
}

@InputType()
export class CreateHospitalInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(2)
  name: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;
}

@InputType()
export class UpdateHospitalInput {
  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @MaxLength(255)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @MaxLength(2000)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @MaxLength(500)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
