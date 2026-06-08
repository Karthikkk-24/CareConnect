import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { StaffService } from './staff.service';
import { CreateStaffInput, StaffType, UpdateStaffInput } from './staff.types';

@Resolver(() => StaffType)
@UseGuards(GqlAuthGuard, RolesGuard)
export class StaffResolver {
  constructor(private readonly staffService: StaffService) {}

  @Query(() => [StaffType])
  @Permissions(PERMISSIONS.STAFF_READ)
  async staffMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<StaffType[]> {
    const resolvedHospitalId = this.staffService.resolveHospitalId(user, hospitalId);
    const members = await this.staffService.findByHospital(resolvedHospitalId);
    return members.map((m) => this.staffService.toStaffType(m));
  }

  @Query(() => StaffType, { nullable: true })
  @Permissions(PERMISSIONS.STAFF_READ)
  async staffMember(@Args('id') id: string): Promise<StaffType | null> {
    const member = await this.staffService.findById(id);
    return member ? this.staffService.toStaffType(member) : null;
  }

  @Mutation(() => StaffType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async createStaffMember(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateStaffInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<StaffType> {
    const resolvedHospitalId = this.staffService.resolveHospitalId(user, hospitalId);
    const member = await this.staffService.create(resolvedHospitalId, input);
    const full = await this.staffService.findById(member.id);
    return this.staffService.toStaffType(full!);
  }

  @Mutation(() => StaffType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async updateStaffMember(
    @Args('id') id: string,
    @Args('input') input: UpdateStaffInput,
  ): Promise<StaffType> {
    const member = await this.staffService.update(id, input);
    const full = await this.staffService.findById(member.id);
    return this.staffService.toStaffType(full!);
  }

  @Mutation(() => Boolean)
  @Roles(ROLES.HOSPITAL_ADMIN)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async deleteStaffMember(@Args('id') id: string): Promise<boolean> {
    return this.staffService.remove(id);
  }
}
