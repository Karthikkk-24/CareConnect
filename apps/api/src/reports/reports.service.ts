import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient, StaffProfile } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AppointmentsService } from '../appointments/appointments.service';
import { AdmissionsService } from '../admissions/admissions.service';
import { BillingService } from '../billing/billing.service';
import { HospitalReportsType } from './reports.types';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
    private readonly appointmentsService: AppointmentsService,
    private readonly admissionsService: AdmissionsService,
    private readonly billingService: BillingService,
  ) {}

  assertHospitalAccess(user: AuthenticatedUser, hospitalId: string) {
    if (user.roles.includes('super_admin')) return;
    if (!user.hospitalId || user.hospitalId !== hospitalId) {
      throw new ForbiddenException('Access denied for this hospital');
    }
  }

  resolveHospitalId(user: AuthenticatedUser, hospitalId?: string): string {
    if (user.roles.includes('super_admin') && hospitalId) return hospitalId;
    const id = hospitalId ?? user.hospitalId;
    if (!id) throw new NotFoundException('Hospital context required');
    this.assertHospitalAccess(user, id);
    return id;
  }

  async getHospitalReports(hospitalId: string): Promise<HospitalReportsType> {
    const [
      patientCount,
      staffCount,
      appointmentsToday,
      activeAdmissions,
      revenueTotal,
    ] = await Promise.all([
      this.patientsRepo.count({ where: { hospitalId } }),
      this.staffRepo.count({ where: { hospitalId, isActive: true } }),
      this.appointmentsService.countAppointmentsToday(hospitalId),
      this.admissionsService.countActive(hospitalId),
      this.billingService.sumRevenue(hospitalId),
    ]);

    return {
      patientCount,
      staffCount,
      appointmentsToday,
      activeAdmissions,
      revenueTotal,
    };
  }
}
