import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AppointmentsService } from '../appointments/appointments.service';
import { AdmissionsService } from '../admissions/admissions.service';
import { DashboardStatsType } from './dashboard.types';

@Injectable()
export class DashboardService {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly admissionsService: AdmissionsService,
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

  async getStats(hospitalId: string): Promise<DashboardStatsType> {
    const [appointmentsToday, activeAdmissions] = await Promise.all([
      this.appointmentsService.countAppointmentsToday(hospitalId),
      this.admissionsService.countActive(hospitalId),
    ]);

    return { appointmentsToday, activeAdmissions };
  }
}
