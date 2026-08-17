import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Hospital } from '../database/entities';

export type ResolveHospitalOptions = {
  /**
   * Tenant writes (including super_admin targeting a hospital) must not
   * mutate an inactive hospital. Reads may still let super_admin view
   * across hospitals after tenant lockout.
   */
  write?: boolean;
};

@Injectable()
export class HospitalContextService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalsRepo: Repository<Hospital>,
  ) {}

  /**
   * Resolve hospital scope, then refuse inactive hospitals (#284).
   * Missing hospital rows are left to the caller (typically 404).
   */
  async resolveHospitalId(
    user: AuthenticatedUser,
    hospitalId?: string,
    options?: ResolveHospitalOptions,
  ): Promise<string> {
    const id = this.resolveTenantHospitalId(user, hospitalId);
    const hospital = await this.hospitalsRepo.findOne({ where: { id } });
    if (hospital && hospital.isActive === false) {
      const isSuperAdmin = user.roles.includes('super_admin');
      if (options?.write === false && isSuperAdmin) {
        return id;
      }
      throw new ForbiddenException(
        'This hospital is currently inactive; tenant access is unavailable',
      );
    }
    return id;
  }

  resolveTenantHospitalId(
    user: AuthenticatedUser,
    hospitalId?: string,
  ): string {
    if (user.roles.includes('super_admin') && hospitalId) return hospitalId;
    const id = hospitalId ?? user.hospitalId;
    if (!id) throw new NotFoundException('Hospital context required');
    this.assertHospitalAccess(user, id);
    return id;
  }

  assertHospitalAccess(user: AuthenticatedUser, hospitalId: string) {
    if (user.roles.includes('super_admin')) return;
    if (!user.hospitalId || user.hospitalId !== hospitalId) {
      throw new ForbiddenException('Access denied for this hospital');
    }
  }
}
