import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient, StaffProfile } from '../database/entities';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import { BillingModule } from '../billing/billing.module';
import { ReportsResolver } from './reports.resolver';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, StaffProfile]),
    AppointmentsModule,
    AdmissionsModule,
    BillingModule,
  ],
  providers: [ReportsResolver, ReportsService],
})
export class ReportsModule {}
