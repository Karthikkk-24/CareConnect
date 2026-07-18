import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { PortalService } from './portal.service';
import { PortalPatientRecordsType } from './portal.types';

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
}
