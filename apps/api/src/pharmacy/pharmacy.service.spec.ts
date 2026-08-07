import { NotFoundException } from '@nestjs/common';
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
  };

  const pharmacyStockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const prescriptionsRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
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
          items: [{ drugName: 'Amoxicillin' }],
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

    it('rejects when stock quantity is insufficient', async () => {
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
          items: [{ drugName: 'Amoxicillin' }, { drugName: 'Amoxicillin' }],
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

    it('decrements stock and marks dispensed when sufficient', async () => {
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

      const result = await service.dispensePrescription(
        'hospital-a',
        { prescriptionId: 'rx-1' },
        actor,
      );

      expect(stock.quantity).toBe('4.00');
      expect(result.status).toBe('dispensed');
      expect(audit.log).toHaveBeenCalled();
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
});
