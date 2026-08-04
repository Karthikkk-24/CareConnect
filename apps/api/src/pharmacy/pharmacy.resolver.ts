import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { PharmacyService } from './pharmacy.service';
import {
  DispensePrescriptionInput,
  PendingPrescriptionType,
  PharmacyStockType,
  UpsertPharmacyStockInput,
} from './pharmacy.types';

const PHARMACY_ROLES = [
  ROLES.PHARMACIST,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
] as const;

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class PharmacyResolver {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Query(() => [PharmacyStockType])
  @Roles(...PHARMACY_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async pharmacyStock(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PharmacyStockType[]> {
    const resolvedHospitalId = this.pharmacyService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.pharmacyService.listPharmacyStock(resolvedHospitalId);
  }

  @Query(() => [PendingPrescriptionType])
  @Roles(...PHARMACY_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async pendingPrescriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PendingPrescriptionType[]> {
    const resolvedHospitalId = this.pharmacyService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.pharmacyService.listPendingPrescriptions(resolvedHospitalId);
  }

  @Mutation(() => PharmacyStockType)
  @Roles(...PHARMACY_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async upsertPharmacyStock(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpsertPharmacyStockInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PharmacyStockType> {
    const resolvedHospitalId = this.pharmacyService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.pharmacyService.upsertPharmacyStock(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => PendingPrescriptionType)
  @Roles(...PHARMACY_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async dispensePrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: DispensePrescriptionInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PendingPrescriptionType> {
    const resolvedHospitalId = this.pharmacyService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.pharmacyService.dispensePrescription(
      resolvedHospitalId,
      input,
      user,
    );
  }
}
