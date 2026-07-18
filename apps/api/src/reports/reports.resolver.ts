import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { ReportsService } from './reports.service';
import { HospitalReportsType } from './reports.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class ReportsResolver {
  constructor(private readonly reportsService: ReportsService) {}

  @Query(() => HospitalReportsType)
  @Permissions(PERMISSIONS.REPORTS_READ)
  async hospitalReports(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<HospitalReportsType> {
    const resolvedHospitalId = this.reportsService.resolveHospitalId(user, hospitalId);
    return this.reportsService.getHospitalReports(resolvedHospitalId);
  }
}
