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
import { BillingService } from './billing.service';
import {
  CreateInvoiceInput,
  InvoiceType,
  RecordPaymentInput,
} from './billing.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class BillingResolver {
  constructor(private readonly billingService: BillingService) {}

  @Query(() => [InvoiceType])
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.BILLING_READ)
  async invoices(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType[]> {
    const resolvedHospitalId = this.billingService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.billingService.listInvoices(resolvedHospitalId);
  }

  @Query(() => InvoiceType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.BILLING_READ)
  async invoice(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = this.billingService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.billingService.getInvoice(resolvedHospitalId, id);
  }

  @Mutation(() => InvoiceType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.BILLING_WRITE)
  async createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateInvoiceInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = this.billingService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.billingService.createInvoice(resolvedHospitalId, input, user);
  }

  @Mutation(() => InvoiceType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.BILLING_WRITE)
  async recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: RecordPaymentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = this.billingService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.billingService.recordPayment(resolvedHospitalId, input, user);
  }

  @Mutation(() => InvoiceType)
  @Roles(...STAFF_ROLES)
  @Permissions(PERMISSIONS.BILLING_WRITE)
  async voidInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InvoiceType> {
    const resolvedHospitalId = this.billingService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.billingService.voidInvoice(resolvedHospitalId, id, user);
  }
}
