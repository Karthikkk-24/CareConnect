import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { PortalService } from './portal.service';
import {
  PortalBookAppointmentInput,
  PortalCancelAppointmentInput,
  PortalPatientRecordsType,
} from './portal.types';
import { AppointmentType } from '../appointments/appointments.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class PortalResolver {
  constructor(private readonly portalService: PortalService) {}

  @Query(() => PortalPatientRecordsType)
  @Roles(ROLES.PATIENT, ROLES.SUPER_ADMIN)
  async portalPatientRecords(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortalPatientRecordsType> {
    return this.portalService.portalPatientRecords(user);
  }

  @Mutation(() => AppointmentType)
  @Roles(ROLES.PATIENT, ROLES.SUPER_ADMIN)
  async portalBookAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: PortalBookAppointmentInput,
  ): Promise<AppointmentType> {
    return this.portalService.portalBookAppointment(user, input);
  }

  @Mutation(() => AppointmentType)
  @Roles(ROLES.PATIENT, ROLES.SUPER_ADMIN)
  async portalCancelAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: PortalCancelAppointmentInput,
  ): Promise<AppointmentType> {
    return this.portalService.portalCancelAppointment(user, input);
  }
}
