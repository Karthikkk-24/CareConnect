import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

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
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sku?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

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

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  quantity: number;
}
