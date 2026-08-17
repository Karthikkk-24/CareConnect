import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { AuditService } from './audit.service';
import { AuditLogsPageType } from './audit.types';
import { HospitalContextService } from '../common/hospital-context.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class AuditResolver {
  constructor(
    private readonly auditService: AuditService,
    private readonly hospitalContext: HospitalContextService,
  ) {}

  @Query(() => AuditLogsPageType)
  @Permissions(PERMISSIONS.REPORTS_READ)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  async auditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('resource', { nullable: true }) resource?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<AuditLogsPageType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.auditService.listHospitalLogs(resolvedHospitalId, {
      resource,
      limit,
    });
  }
}
