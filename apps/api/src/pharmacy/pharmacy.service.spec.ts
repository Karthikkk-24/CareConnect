import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PharmacyStock, Prescription } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PharmacyService } from './pharmacy.service';

describe('PharmacyService', () => {
  let service: PharmacyService;

  const manager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn().mockResolvedValue({
      id: 'patient-1',
      hospitalId: 'hospital-a',
    }),
    create: jest.fn((_entity: unknown, data: unknown) => data),
  };

  const pharmacyStockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
  };
  const prescriptionsRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
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
        PharmacyService,
        {
          provide: getRepositoryToken(PharmacyStock),
          useValue: pharmacyStockRepo,
        },
        {
          provide: getRepositoryToken(Prescription),
          useValue: prescriptionsRepo,
        },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(PharmacyService);
  });

  describe('dispensePrescription stock checks', () => {
    it('rejects when stock is missing for a drug', async () => {
      const rxQb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'pending',
          items: [{ drugName: 'Amoxicillin', quantity: '1.00' }],
        }),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      manager.createQueryBuilder
        .mockReturnValueOnce(rxQb)
        .mockReturnValueOnce(stockQb);

      await expect(
        service.dispensePrescription(
          'hospital-a',
          { prescriptionId: 'rx-1' },
          actor,
        ),
      ).rejects.toThrow('No pharmacy stock found for "Amoxicillin"');
    });

    it('rejects when stock quantity is insufficient for line quantities', async () => {
      const rxQb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'pending',
          items: [{ drugName: 'Amoxicillin', quantity: '3.00' }],
        }),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'stock-1',
          drugName: 'Amoxicillin',
          quantity: '1.00',
        }),
      };
      manager.createQueryBuilder
        .mockReturnValueOnce(rxQb)
        .mockReturnValueOnce(stockQb);

      await expect(
        service.dispensePrescription(
          'hospital-a',
          { prescriptionId: 'rx-1' },
          actor,
        ),
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('decrements stock by prescription item quantity when sufficient', async () => {
      const stock = {
        id: 'stock-1',
        drugName: 'Amoxicillin',
        quantity: '10.00',
      };
      const rxQb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'pending',
          items: [{ drugName: 'Amoxicillin', quantity: '3.00' }],
          patient: null,
        }),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stock),
      };
      manager.createQueryBuilder
        .mockReturnValueOnce(rxQb)
        .mockReturnValueOnce(stockQb);
      manager.save
        .mockResolvedValueOnce({ ...stock, quantity: '7.00' })
        .mockResolvedValueOnce({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          status: 'dispensed',
          items: [{ drugName: 'Amoxicillin', quantity: '3.00' }],
        });
      prescriptionsRepo.findOne.mockResolvedValue({
        id: 'rx-1',
        hospitalId: 'hospital-a',
        status: 'dispensed',
        items: [{ drugName: 'Amoxicillin', quantity: '3.00' }],
        patient: null,
      });

      const result = await service.dispensePrescription(
        'hospital-a',
        { prescriptionId: 'rx-1' },
        actor,
      );

      expect(stock.quantity).toBe('7.00');
      expect(result.status).toBe('dispensed');
      expect(audit.log).toHaveBeenCalled();
    });

    it('defaults missing item quantity to 1 when decrementing', async () => {
      const stock = {
        id: 'stock-1',
        drugName: 'Amoxicillin',
        quantity: '5.00',
      };
      const rxQb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'pending',
          items: [{ drugName: 'Amoxicillin' }],
          patient: null,
        }),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stock),
      };
      manager.createQueryBuilder
        .mockReturnValueOnce(rxQb)
        .mockReturnValueOnce(stockQb);
      manager.save
        .mockResolvedValueOnce({ ...stock, quantity: '4.00' })
        .mockResolvedValueOnce({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          status: 'dispensed',
          items: [{ drugName: 'Amoxicillin' }],
        });
      prescriptionsRepo.findOne.mockResolvedValue({
        id: 'rx-1',
        hospitalId: 'hospital-a',
        status: 'dispensed',
        items: [{ drugName: 'Amoxicillin' }],
        patient: null,
      });

      await service.dispensePrescription(
        'hospital-a',
        { prescriptionId: 'rx-1' },
        actor,
      );

      expect(stock.quantity).toBe('4.00');
    });

    it('aggregates same-drug line quantities at 2 decimal places', async () => {
      const stock = {
        id: 'stock-1',
        drugName: 'Amoxicillin',
        quantity: '0.30',
      };
      const rxQb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          patientId: 'patient-1',
          status: 'pending',
          items: [
            { drugName: 'Amoxicillin', quantity: '0.10' },
            { drugName: 'Amoxicillin', quantity: '0.20' },
          ],
          patient: null,
        }),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stock),
      };
      manager.createQueryBuilder
        .mockReturnValueOnce(rxQb)
        .mockReturnValueOnce(stockQb);
      manager.save
        .mockResolvedValueOnce({ ...stock, quantity: '0.00' })
        .mockResolvedValueOnce({
          id: 'rx-1',
          hospitalId: 'hospital-a',
          status: 'dispensed',
          items: [
            { drugName: 'Amoxicillin', quantity: '0.10' },
            { drugName: 'Amoxicillin', quantity: '0.20' },
          ],
        });
      prescriptionsRepo.findOne.mockResolvedValue({
        id: 'rx-1',
        hospitalId: 'hospital-a',
        status: 'dispensed',
        items: [
          { drugName: 'Amoxicillin', quantity: '0.10' },
          { drugName: 'Amoxicillin', quantity: '0.20' },
        ],
        patient: null,
      });

      await service.dispensePrescription(
        'hospital-a',
        { prescriptionId: 'rx-1' },
        actor,
      );

      expect(stock.quantity).toBe('0.00');
    });

    it('throws NotFound when prescription missing', async () => {
      const rxQb = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      manager.createQueryBuilder.mockReturnValueOnce(rxQb);

      await expect(
        service.dispensePrescription(
          'hospital-a',
          { prescriptionId: 'missing' },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertPharmacyStock optimistic concurrency', () => {
    it('throws ConflictException when expectedQuantity mismatches', async () => {
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'stock-1',
          drugName: 'Amoxicillin',
          quantity: '9.00',
          unit: 'each',
        }),
      };
      manager.createQueryBuilder.mockReturnValueOnce(stockQb);

      await expect(
        service.upsertPharmacyStock(
          'hospital-a',
          {
            drugName: 'Amoxicillin',
            quantity: 20,
            expectedQuantity: 10,
          },
          actor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('updates when expectedQuantity matches locked row', async () => {
      const existing = {
        id: 'stock-1',
        hospitalId: 'hospital-a',
        drugName: 'Amoxicillin',
        quantity: '10.00',
        unit: 'each',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
      };
      manager.createQueryBuilder.mockReturnValueOnce(stockQb);
      manager.save.mockResolvedValue({
        ...existing,
        quantity: '20.00',
      });

      const result = await service.upsertPharmacyStock(
        'hospital-a',
        {
          drugName: 'Amoxicillin',
          quantity: 20,
          expectedQuantity: 10,
        },
        actor,
      );

      expect(existing.quantity).toBe('20.00');
      expect(result.quantity).toBe(20);
      expect(audit.log).toHaveBeenCalled();
    });

    it('treats expectedQuantity as equal at 2 decimal places', async () => {
      const existing = {
        id: 'stock-1',
        hospitalId: 'hospital-a',
        drugName: 'Amoxicillin',
        quantity: '0.30',
        unit: 'each',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const stockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
      };
      manager.createQueryBuilder.mockReturnValueOnce(stockQb);
      manager.save.mockResolvedValue({
        ...existing,
        quantity: '1.00',
      });

      const result = await service.upsertPharmacyStock(
        'hospital-a',
        {
          drugName: 'Amoxicillin',
          quantity: 1,
          expectedQuantity: 0.1 + 0.2,
        },
        actor,
      );

      expect(existing.quantity).toBe('1.00');
      expect(result.quantity).toBe(1);
    });
  });

  describe('listPendingPrescriptions pagination', () => {
    it('pages pending prescriptions instead of a silent 200 cap', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 12]),
      };
      prescriptionsRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listPendingPrescriptions('hospital-a');

      expect(qb.take).toHaveBeenCalledWith(50);
      expect(qb.take).not.toHaveBeenCalledWith(200);
      expect(result).toEqual(
        expect.objectContaining({
          items: [],
          total: 12,
          page: 1,
          limit: 50,
          hasMore: false,
        }),
      );
    });
  });
});
