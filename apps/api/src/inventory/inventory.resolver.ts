import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemInput,
  InventoryItemType,
  UpdateInventoryQuantityInput,
} from './inventory.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class InventoryResolver {
  constructor(private readonly inventoryService: InventoryService) {}

  @Query(() => [InventoryItemType])
  @Permissions(PERMISSIONS.HOSPITALS_READ)
  async inventoryItems(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InventoryItemType[]> {
    const resolvedHospitalId = this.inventoryService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.inventoryService.listInventoryItems(resolvedHospitalId);
  }

  @Mutation(() => InventoryItemType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async createInventoryItem(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateInventoryItemInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InventoryItemType> {
    const resolvedHospitalId = this.inventoryService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.inventoryService.createInventoryItem(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => InventoryItemType)
  @Permissions(PERMISSIONS.HOSPITALS_WRITE)
  async updateInventoryQuantity(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateInventoryQuantityInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<InventoryItemType> {
    const resolvedHospitalId = this.inventoryService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.inventoryService.updateInventoryQuantity(
      resolvedHospitalId,
      input,
      user,
    );
  }
}
