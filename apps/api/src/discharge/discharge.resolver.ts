import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { DischargeService } from './discharge.service';
import {
  CreateDischargeInput,
  CreateFollowUpInput,
  DischargeType,
  FollowUpType,
  UpdateFollowUpStatusInput,
} from './discharge.types';

/** Chart reads: clinical staff, not pharmacist or lab_technician. */
const CHART_READ_ROLES = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
  ROLES.SUPER_ADMIN,
] as const;

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class DischargeResolver {
  constructor(private readonly dischargeService: DischargeService) {}

  @Query(() => [FollowUpType])
  @Roles(...CHART_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async followUps(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<FollowUpType[]> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.dischargeService.followUps(resolvedHospitalId, status);
  }

  @Query(() => [DischargeType])
  @Roles(...CHART_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async discharges(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DischargeType[]> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.dischargeService.dischargesForPatient(
      resolvedHospitalId,
      patientId,
    );
  }

  @Mutation(() => DischargeType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createDischarge(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateDischargeInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DischargeType> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.dischargeService.createDischarge(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => FollowUpType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateFollowUpInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<FollowUpType> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.dischargeService.createFollowUp(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => FollowUpType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async updateFollowUpStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateFollowUpStatusInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<FollowUpType> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.dischargeService.updateFollowUpStatus(
      resolvedHospitalId,
      input,
      user,
    );
  }
}
