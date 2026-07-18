import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { DischargeService } from './discharge.service';
import {
  CreateDischargeInput,
  CreateFollowUpInput,
  DischargeType,
  FollowUpType,
  UpdateFollowUpStatusInput,
} from './discharge.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class DischargeResolver {
  constructor(private readonly dischargeService: DischargeService) {}

  @Query(() => [FollowUpType])
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async followUps(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<FollowUpType[]> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(user, hospitalId);
    return this.dischargeService.followUps(resolvedHospitalId, status);
  }

  @Query(() => [DischargeType])
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async discharges(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DischargeType[]> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(user, hospitalId);
    return this.dischargeService.dischargesForPatient(resolvedHospitalId, patientId);
  }

  @Mutation(() => DischargeType)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createDischarge(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateDischargeInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DischargeType> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(user, hospitalId);
    return this.dischargeService.createDischarge(resolvedHospitalId, input, user);
  }

  @Mutation(() => FollowUpType)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateFollowUpInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<FollowUpType> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(user, hospitalId);
    return this.dischargeService.createFollowUp(resolvedHospitalId, input, user);
  }

  @Mutation(() => FollowUpType)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async updateFollowUpStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateFollowUpStatusInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<FollowUpType> {
    const resolvedHospitalId = this.dischargeService.resolveHospitalId(user, hospitalId);
    return this.dischargeService.updateFollowUpStatus(resolvedHospitalId, input, user);
  }
}
