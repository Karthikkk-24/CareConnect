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

  async getHospitalReports(
    hospitalId: string,
    from?: string,
    to?: string,
  ): Promise<HospitalReportsType> {
    const rangeStart = from ? new Date(from) : undefined;
    const rangeEnd = to ? new Date(to) : undefined;
    if (rangeEnd) {
      rangeEnd.setHours(23, 59, 59, 999);
    }

    const useRange = Boolean(rangeStart && rangeEnd);

    const [
      patientCount,
      staffCount,
      appointmentsToday,
      activeAdmissions,
      revenueTotal,
    ] = await Promise.all([
      this.patientsRepo.count({ where: { hospitalId } }),
      this.staffRepo.count({ where: { hospitalId, isActive: true } }),
      useRange && rangeStart && rangeEnd
        ? this.appointmentsService.countAppointmentsInRange(
            hospitalId,
            rangeStart,
            new Date(rangeEnd.getTime() + 1),
          )
        : this.appointmentsService.countAppointmentsToday(hospitalId),
      this.admissionsService.countActive(hospitalId),
      useRange && rangeStart && rangeEnd
        ? this.billingService.sumRevenueInRange(
            hospitalId,
            rangeStart,
            new Date(rangeEnd.getTime() + 1),
          )
        : this.billingService.sumRevenue(hospitalId),
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
