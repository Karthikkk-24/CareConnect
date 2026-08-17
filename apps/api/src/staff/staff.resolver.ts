import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { AllowAuthenticated } from '../rbac/allow-authenticated.decorator';
import { StaffService } from './staff.service';
import { CreateStaffInput, StaffType, UpdateStaffInput } from './staff.types';
import { HospitalContextService } from '../common/hospital-context.service';

@Resolver(() => StaffType)
@UseGuards(GqlAuthGuard, RolesGuard)
export class StaffResolver {
  constructor(
    private readonly staffService: StaffService,
    private readonly hospitalContext: HospitalContextService,
  ) {}

  @Query(() => [StaffType])
  @Permissions(PERMISSIONS.STAFF_READ)
  async staffMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<StaffType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    const members = await this.staffService.findByHospital(resolvedHospitalId);
    return members.map((m) => this.staffService.toStaffType(m));
  }

  @Query(() => StaffType, { nullable: true })
  @Permissions(PERMISSIONS.STAFF_READ)
  async staffMember(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ): Promise<StaffType | null> {
    const member = await this.staffService.findByIdForUser(id, user);
    return member ? this.staffService.toStaffType(member) : null;
  }

  @Mutation(() => StaffType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async createStaffMember(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateStaffInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<StaffType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    const member = await this.staffService.create(
      resolvedHospitalId,
      input,
      user,
    );
    const inviteToken = (member as { inviteToken?: string }).inviteToken;
    const full = await this.staffService.findById(member.id);
    return this.staffService.toStaffType({ ...full!, inviteToken });
  }

  @Mutation(() => StaffType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async updateStaffMember(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('input') input: UpdateStaffInput,
  ): Promise<StaffType> {
    const existing = await this.staffService.findByIdForUser(id, user);
    if (!existing) throw new NotFoundException('Staff member not found');
    await this.hospitalContext.resolveHospitalId(user, existing.hospitalId, {
      write: true,
    });
    const member = await this.staffService.update(id, input, user);
    const full = await this.staffService.findById(member.id);
    return this.staffService.toStaffType(full!);
  }

  @Mutation(() => StaffType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async resendStaffInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ): Promise<StaffType> {
    const existing = await this.staffService.findByIdForUser(id, user);
    if (!existing) throw new NotFoundException('Staff member not found');
    await this.hospitalContext.resolveHospitalId(user, existing.hospitalId, {
      write: true,
    });
    const member = await this.staffService.resendStaffInvite(id, user);
    const inviteToken = member.inviteToken;
    const full = await this.staffService.findById(member.id);
    return this.staffService.toStaffType({ ...full!, inviteToken });
  }

  @Mutation(() => Boolean)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.STAFF_WRITE)
  async deleteStaffMember(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const existing = await this.staffService.findByIdForUser(id, user);
    if (!existing) throw new NotFoundException('Staff member not found');
    await this.hospitalContext.resolveHospitalId(user, existing.hospitalId, {
      write: true,
    });
    return this.staffService.remove(id, user);
  }

  @Mutation(() => StaffType)
  @AllowAuthenticated()
  async acceptStaffInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Args('token') token: string,
  ): Promise<StaffType> {
    const member = await this.staffService.acceptInvite(
      token,
      user.authId,
      user.email,
    );
    return this.staffService.toStaffType(member);
  }
}
