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
  UpdateBedInput,
  UpdateDepartmentInput,
  UpdateWardInput,
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
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.listDepartments(resolvedHospitalId);
  }

  @Query(() => [WardType])
  @Permissions(PERMISSIONS.HOSPITALS_READ)
  async wards(
    @CurrentUser() user: AuthenticatedUser,
    @Args('departmentId', { nullable: true }) departmentId?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<WardType[]> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.listWards(resolvedHospitalId, departmentId);
  }

  @Query(() => [BedType])
  @Permissions(PERMISSIONS.HOSPITALS_READ)
  async beds(
    @CurrentUser() user: AuthenticatedUser,
    @Args('wardId', { nullable: true }) wardId?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BedType[]> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.listBeds(resolvedHospitalId, wardId);
  }

  @Mutation(() => DepartmentType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateDepartmentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DepartmentType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.createDepartment(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => WardType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createWard(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateWardInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<WardType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.createWard(resolvedHospitalId, input, user);
  }

  @Mutation(() => BedType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createBed(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateBedInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BedType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.createBed(resolvedHospitalId, input, user);
  }

  @Mutation(() => Boolean)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async deleteDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<boolean> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.deleteDepartment(resolvedHospitalId, id, user);
  }

  @Mutation(() => Boolean)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async deleteWard(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<boolean> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.deleteWard(resolvedHospitalId, id, user);
  }

  @Mutation(() => Boolean)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async deleteBed(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<boolean> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.deleteBed(resolvedHospitalId, id, user);
  }

  @Mutation(() => DepartmentType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async updateDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('input') input: UpdateDepartmentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DepartmentType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.updateDepartment(
      resolvedHospitalId,
      id,
      input,
      user,
    );
  }

  @Mutation(() => WardType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async updateWard(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('input') input: UpdateWardInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<WardType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.updateWard(resolvedHospitalId, id, input, user);
  }

  @Mutation(() => BedType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async updateBed(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('input') input: UpdateBedInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BedType> {
    const resolvedHospitalId = this.facilityService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.facilityService.updateBed(resolvedHospitalId, id, input, user);
  }
}
