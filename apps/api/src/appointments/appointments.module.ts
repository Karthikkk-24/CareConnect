import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment, Department, Patient } from '../database/entities';
import { AppointmentsResolver } from './appointments.resolver';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Patient, Department])],
  providers: [AppointmentsResolver, AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
