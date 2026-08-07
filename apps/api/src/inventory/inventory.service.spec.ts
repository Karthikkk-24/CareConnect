import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryItem } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const manager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  const inventoryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
  };
  const audit = { log: jest.fn() };

  const actor: AuthenticatedUser = {
    id: 'pharm-1',
    authId: 'auth-1',
    email: 'pharm@h.com',
    fullName: 'Pharmacist',
    hospitalId: 'hospital-a',
    roles: ['pharmacist'],
    permissions: ['patients:write'],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryItem), useValue: inventoryRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  describe('updateInventoryQuantity delta', () => {
    it('applies concurrent +1/+1 from the same base to yield +2', async () => {
      let quantity = 10;
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: 'item-1',
            hospitalId: 'hospital-a',
            quantity: quantity.toFixed(2),
          }),
        ),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.save.mockImplementation((item: { quantity: string }) => {
        quantity = Number(item.quantity);
        return Promise.resolve({ ...item, id: 'item-1' });
      });

      await service.updateInventoryQuantity(
        'hospital-a',
        { id: 'item-1', delta: 1 },
        actor,
      );
      await service.updateInventoryQuantity(
        'hospital-a',
        { id: 'item-1', delta: 1 },
        actor,
      );

      expect(quantity).toBe(12);
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('clamps quantity at zero when delta would go negative', async () => {
      const item = {
        id: 'item-1',
        hospitalId: 'hospital-a',
        quantity: '1.00',
      };
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(item),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.save.mockImplementation((row: typeof item) =>
        Promise.resolve(row),
      );

      const result = await service.updateInventoryQuantity(
        'hospital-a',
        { id: 'item-1', delta: -5 },
        actor,
      );

      expect(result.quantity).toBe(0);
    });

    it('rejects non-finite delta', async () => {
      await expect(
        service.updateInventoryQuantity(
          'hospital-a',
          { id: 'item-1', delta: Number.NaN },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound when item missing', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      manager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateInventoryQuantity(
          'hospital-a',
          { id: 'missing', delta: 1 },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
