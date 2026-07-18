import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { FacilityService } from './facility.service';
import {
  BedType,
  CreateBedInput,
  CreateDepartmentInput,
  CreateWardInput,
  DepartmentType,
  WardType,
} from './facility.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class FacilityResolver {
  constructor(private readonly facilityService: FacilityService) {}

  @Query(() => [DepartmentType])
  @Permissions(PERMISSIONS.HOSPITALS_READ)
  async departments(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DepartmentType[]> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(user, hospitalId);
    return this.facilityService.listDepartments(resolvedHospitalId);
  }

  @Query(() => [WardType])
  @Permissions(PERMISSIONS.HOSPITALS_READ)
  async wards(
    @CurrentUser() user: AuthenticatedUser,
    @Args('departmentId', { nullable: true }) departmentId?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<WardType[]> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(user, hospitalId);
    return this.facilityService.listWards(resolvedHospitalId, departmentId);
  }

  @Query(() => [BedType])
  @Permissions(PERMISSIONS.HOSPITALS_READ)
  async beds(
    @CurrentUser() user: AuthenticatedUser,
    @Args('wardId', { nullable: true }) wardId?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BedType[]> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(user, hospitalId);
    return this.facilityService.listBeds(resolvedHospitalId, wardId);
  }

  @Mutation(() => DepartmentType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateDepartmentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DepartmentType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(user, hospitalId);
    return this.facilityService.createDepartment(resolvedHospitalId, input, user);
  }

  @Mutation(() => WardType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createWard(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateWardInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<WardType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(user, hospitalId);
    return this.facilityService.createWard(resolvedHospitalId, input, user);
  }

  @Mutation(() => BedType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createBed(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateBedInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BedType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(user, hospitalId);
    return this.facilityService.createBed(resolvedHospitalId, input, user);
  }
}
