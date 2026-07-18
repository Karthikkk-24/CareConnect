import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admission,
  Invoice,
  InvoiceItem,
  Patient,
  Payment,
} from '../database/entities';
import { BillingResolver } from './billing.resolver';
import { BillingService } from './billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, Payment, Patient, Admission]),
  ],
  providers: [BillingResolver, BillingService],
  exports: [BillingService],
})
export class BillingModule {}
