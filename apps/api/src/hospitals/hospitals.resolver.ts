import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { STAFF_ROLES } from '../rbac/staff-roles';
import { AuditService } from '../audit/audit.service';
import { HospitalsService } from './hospitals.service';
import {
  CreateHospitalInput,
  HospitalType,
  UpdateHospitalInput,
} from './hospitals.types';

@Resolver(() => HospitalType)
@UseGuards(GqlAuthGuard, RolesGuard)
export class HospitalsResolver {
  constructor(
    private readonly hospitalsService: HospitalsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [HospitalType])
  hospitals(@CurrentUser() user: AuthenticatedUser): Promise<HospitalType[]> {
    if (user.roles.includes('super_admin')) {
      return this.hospitalsService.findAll();
    }
    return this.hospitalsService.findForUser(user);
  }

  @Query(() => HospitalType, { nullable: true })
  hospital(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ): Promise<HospitalType | null> {
    return this.hospitalsService.findByIdForUser(id, user);
  }

  /** Bootstrap: only unassigned non-patient/non-staff users may create a hospital during admin onboarding. */
  @Mutation(() => HospitalType)
  async createHospital(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateHospitalInput,
  ): Promise<HospitalType> {
    if (user.roles.includes(ROLES.PATIENT)) {
      throw new ForbiddenException('Patients cannot create hospitals');
    }

    const hasStaffRole = user.roles.some((role) =>
      STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]),
    );

    const canBootstrap = !user.hospitalId && !hasStaffRole;
    const canWrite =
      user.roles.includes('super_admin') ||
      user.permissions.includes(PERMISSIONS.HOSPITALS_WRITE);

    if (!canBootstrap && !canWrite) {
      throw new ForbiddenException('Not allowed to create hospitals');
    }

    const hospital = await this.hospitalsService.create(input);
    await this.audit.log({
      actorId: user.id,
      hospitalId: hospital.id,
      action: 'create',
      resource: 'hospital',
      resourceId: hospital.id,
    });
    return hospital;
  }

  @Mutation(() => HospitalType)
  @Roles(ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async updateHospital(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('input') input: UpdateHospitalInput,
  ): Promise<HospitalType> {
    const hospital = await this.hospitalsService.update(id, input, user);
    await this.audit.log({
      actorId: user.id,
      hospitalId: id,
      action: 'update',
      resource: 'hospital',
      resourceId: id,
    });
    return hospital;
  }
}
