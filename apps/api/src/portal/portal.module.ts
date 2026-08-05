import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Appointment,
  Hospital,
  LabOrder,
  LabResult,
  Patient,
  Prescription,
} from '../database/entities';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ClinicalModule } from '../clinical/clinical.module';
import { PortalResolver } from './portal.resolver';
import { PortalService } from './portal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      Appointment,
      Prescription,
      LabOrder,
      LabResult,
      Hospital,
    ]),
    AppointmentsModule,
    ClinicalModule,
  ],
  providers: [PortalResolver, PortalService],
})
export class PortalModule {}
