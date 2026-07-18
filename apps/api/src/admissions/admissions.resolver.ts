import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { AdmissionsService } from './admissions.service';
import {
  AdmissionType,
  AdmitPatientInput,
  DischargeAdmissionInput,
  WardOccupancyType,
} from './admissions.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class AdmissionsResolver {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Query(() => [AdmissionType])
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async activeAdmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AdmissionType[]> {
    const resolvedHospitalId = this.admissionsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.admissionsService.activeAdmissions(resolvedHospitalId);
  }

  @Query(() => [WardOccupancyType])
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async wardOccupancy(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<WardOccupancyType[]> {
    const resolvedHospitalId = this.admissionsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.admissionsService.wardOccupancy(resolvedHospitalId);
  }

  @Mutation(() => AdmissionType)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async admitPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: AdmitPatientInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AdmissionType> {
    const resolvedHospitalId = this.admissionsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.admissionsService.admitPatient(resolvedHospitalId, input, user);
  }

  @Mutation(() => AdmissionType)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async dischargeAdmission(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: DischargeAdmissionInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AdmissionType> {
    const resolvedHospitalId = this.admissionsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.admissionsService.dischargeAdmission(
      resolvedHospitalId,
      input,
      user,
    );
  }
}
