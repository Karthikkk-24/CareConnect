import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AppointmentsModule, AdmissionsModule],
  providers: [DashboardResolver, DashboardService],
})
export class DashboardModule {}
