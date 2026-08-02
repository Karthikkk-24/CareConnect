import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PatientType } from '../patients/patients.types';

export const CREATE_INVOICE_STATUSES = ['draft', 'issued'] as const;

@ObjectType()
export class InvoiceItemType {
  @Field(() => ID)
  id: string;

  @Field()
  description: string;

  @Field(() => Float)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class PaymentType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  invoiceId: string;

  @Field(() => Float)
  amount: number;

  @Field()
  method: string;

  @Field()
  paidAt: Date;

  @Field(() => ID, { nullable: true })
  recordedById?: string;
}

@ObjectType()
export class InvoiceType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  hospitalId: string;

  @Field(() => ID)
  patientId: string;

  @Field(() => PatientType, { nullable: true })
  patient?: PatientType;

  @Field(() => ID, { nullable: true })
  admissionId?: string;

  @Field()
  status: string;

  @Field(() => Float)
  totalAmount: number;

  @Field({ nullable: true })
  issuedAt?: Date;

  @Field(() => [InvoiceItemType])
  items: InvoiceItemType[];

  @Field(() => [PaymentType])
  payments: PaymentType[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateInvoiceItemInput {
  @Field()
  @IsString()
  @MinLength(1)
  description: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

@InputType()
export class CreateInvoiceInput {
  @Field()
  @IsUUID()
  patientId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn([...CREATE_INVOICE_STATUSES])
  status?: string;

  @Field(() => [CreateInvoiceItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemInput)
  items: CreateInvoiceItemInput[];
}

@InputType()
export class RecordPaymentInput {
  @Field()
  @IsUUID()
  invoiceId: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @Field()
  @IsString()
  @MinLength(1)
  method: string;
}
