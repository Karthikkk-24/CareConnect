import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { InventoryItem } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  CreateInventoryItemInput,
  InventoryItemType,
  UpdateInventoryQuantityInput,
} from './inventory.types';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { code?: string }).code === '23505'
  );
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    private readonly audit: AuditService,
  ) {}

  assertHospitalAccess(user: AuthenticatedUser, hospitalId: string) {
    if (user.roles.includes('super_admin')) return;
    if (!user.hospitalId || user.hospitalId !== hospitalId) {
      throw new ForbiddenException('Access denied for this hospital');
    }
  }

  resolveHospitalId(user: AuthenticatedUser, hospitalId?: string): string {
    if (user.roles.includes('super_admin') && hospitalId) return hospitalId;
    const id = hospitalId ?? user.hospitalId;
    if (!id) throw new NotFoundException('Hospital context required');
    this.assertHospitalAccess(user, id);
    return id;
  }

  private toNumber(value: string | number | undefined | null): number {
    if (value == null) return 0;
    return Number(value);
  }

  toInventoryItemType(item: InventoryItem): InventoryItemType {
    return {
      id: item.id,
      hospitalId: item.hospitalId,
      name: item.name,
      sku: item.sku,
      quantity: this.toNumber(item.quantity),
      unit: item.unit,
      reorderLevel: this.toNumber(item.reorderLevel),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async createInventoryItem(
    hospitalId: string,
    input: CreateInventoryItemInput,
    actor: AuthenticatedUser,
  ): Promise<InventoryItemType> {
    let item: InventoryItem;
    try {
      item = await this.inventoryRepo.save(
        this.inventoryRepo.create({
          hospitalId,
          name: input.name,
          sku: input.sku,
          quantity: (input.quantity ?? 0).toFixed(2),
          unit: input.unit ?? 'each',
          reorderLevel: (input.reorderLevel ?? 0).toFixed(2),
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'An inventory item with this SKU already exists in this hospital',
        );
      }
      throw error;
    }

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'inventory_item',
      resourceId: item.id,
      metadata: { name: item.name },
    });

    return this.toInventoryItemType(item);
  }

  async listInventoryItems(hospitalId: string): Promise<InventoryItemType[]> {
    const items = await this.inventoryRepo.find({
      where: { hospitalId },
      order: { name: 'ASC' },
      take: 200,
    });
    return items.map((item) => this.toInventoryItemType(item));
  }

  async updateInventoryQuantity(
    hospitalId: string,
    input: UpdateInventoryQuantityInput,
    actor: AuthenticatedUser,
  ): Promise<InventoryItemType> {
    const saved = await this.inventoryRepo.manager.transaction(
      async (manager) => {
        const item = await manager
          .createQueryBuilder(InventoryItem, 'item')
          .setLock('pessimistic_write')
          .where('item.id = :id', { id: input.id })
          .andWhere('item.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!item) throw new NotFoundException('Inventory item not found');

        item.quantity = input.quantity.toFixed(2);
        return manager.save(item);
      },
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update',
      resource: 'inventory_item',
      resourceId: saved.id,
      metadata: { quantity: input.quantity },
    });

    return this.toInventoryItemType(saved);
  }
}
