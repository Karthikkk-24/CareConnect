import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { BillingService } from './billing.service';
import { HospitalContextService } from '../common/hospital-context.service';
import {
  CreateInvoiceInput,
  InvoiceType,
  InvoicesPageType,
  RecordPaymentInput,
  BillingPatientLookupType,
} from './billing.types';
import { PaginationInput } from '../common/dto/pagination.dto';

/**
 * Billing resolvers: finance roles only.
 * Seed 002 grants billing:read to accountant/hospital_admin/super_admin.
 * Receptionist does not have billing:read. Pharmacist is excluded (#282).
 * hospital_manager is listed for defense in depth even without the slug.
 */
const BILLING_ROLES = [
  ROLES.ACCOUNTANT,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
  ROLES.SUPER_ADMIN,
] as const;

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class BillingResolver {
  constructor(
    private readonly billingService: BillingService,
    private readonly hospitalContext: HospitalContextService,
  ) {}

  @Query(() => InvoicesPageType)
  @Roles(...BILLING_ROLES)
  @Permissions(PERMISSIONS.BILLING_READ)
  async invoices(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('pagination', { nullable: true, type: () => PaginationInput })
    pagination?: PaginationInput,
  ): Promise<InvoicesPageType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.billingService.listInvoices(resolvedHospitalId, pagination);
  }

  @Query(() => [BillingPatientLookupType])
  @Roles(...BILLING_ROLES)
  @Permissions(PERMISSIONS.BILLING_READ)
  async billingPatientSearch(
    @CurrentUser() user: AuthenticatedUser,
    @Args('search') search: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BillingPatientLookupType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.billingService.searchPatientsForBilling(
      resolvedHospitalId,
      search,
      limit,
    );
  }

  @Query(() => InvoiceType)
  @Roles(...BILLING_ROLES)
  @Permissions(PERMISSIONS.BILLING_READ)
  async invoice(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.billingService.getInvoice(resolvedHospitalId, id);
  }

  @Mutation(() => InvoiceType)
  @Roles(...BILLING_ROLES)
  @Permissions(PERMISSIONS.BILLING_WRITE)
  async createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateInvoiceInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.billingService.createInvoice(resolvedHospitalId, input, user);
  }

  @Mutation(() => InvoiceType)
  @Roles(...BILLING_ROLES)
  @Permissions(PERMISSIONS.BILLING_WRITE)
  async recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: RecordPaymentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.billingService.recordPayment(resolvedHospitalId, input, user);
  }

  @Mutation(() => InvoiceType)
  @Roles(...BILLING_ROLES)
  @Permissions(PERMISSIONS.BILLING_WRITE)
  async voidInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.billingService.voidInvoice(resolvedHospitalId, id, user);
  }
}
