import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { STAFF_ROLES } from '../rbac/staff-roles';
import { AppointmentsService } from './appointments.service';
import { HospitalContextService } from '../common/hospital-context.service';
import {
  AppointmentType,
  CancelAppointmentInput,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from './appointments.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class AppointmentsResolver {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly hospitalContext: HospitalContextService,
  ) {}

  @Query(() => [AppointmentType])
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.APPOINTMENTS_READ)
  async appointments(
    @CurrentUser() user: AuthenticatedUser,
    @Args('date', { nullable: true }) date?: string,
    @Args('doctorId', { nullable: true }) doctorId?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<AppointmentType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.appointmentsService.findAll(
      resolvedHospitalId,
      date,
      doctorId,
      status,
      user,
    );
  }

  @Mutation(() => AppointmentType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.APPOINTMENTS_WRITE)
  async createAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateAppointmentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AppointmentType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.appointmentsService.create(resolvedHospitalId, input, user);
  }

  @Mutation(() => AppointmentType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.APPOINTMENTS_WRITE)
  async updateAppointmentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('status') status: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AppointmentType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.appointmentsService.updateStatus(
      id,
      status,
      resolvedHospitalId,
      user,
    );
  }

  @Mutation(() => AppointmentType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.APPOINTMENTS_WRITE)
  async rescheduleAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: RescheduleAppointmentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AppointmentType> {
    const resolvedHospitalId = this.appointmentsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.appointmentsService.reschedule(resolvedHospitalId, input, user);
  }

  @Mutation(() => AppointmentType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.APPOINTMENTS_WRITE)
  async cancelAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CancelAppointmentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<AppointmentType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.appointmentsService.cancel(resolvedHospitalId, input, user);
  }
}
