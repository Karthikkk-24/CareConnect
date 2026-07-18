import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { DashboardService } from './dashboard.service';
import { DashboardStatsType } from './dashboard.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardStatsType)
  @Permissions(PERMISSIONS.REPORTS_READ)
  async dashboardStats(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DashboardStatsType> {
    const resolvedHospitalId = this.dashboardService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.dashboardService.getStats(resolvedHospitalId);
  }
}
