import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

@ObjectType()
export class InventoryItemType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  sku?: string;

  @Field(() => Float)
  quantity: number;

  @Field()
  unit: string;

  @Field(() => Float)
  reorderLevel: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateInventoryItemInput {
  @MaxLength(255)
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @MaxLength(100)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sku?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @MaxLength(50)
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;
}

@InputType()
export class UpdateInventoryQuantityInput {
  @Field()
  @IsUUID()
  id: string;

  /** Signed adjustment applied under row lock (e.g. +1 / -1). */
  @Field(() => Float)
  @IsNumber()
  delta: number;
}
