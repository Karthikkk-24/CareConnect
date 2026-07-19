import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PharmacyStock, Prescription } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PharmacyService } from './pharmacy.service';

describe('PharmacyService', () => {
  let service: PharmacyService;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    authId: 'auth-1',
    email: 'pharm@hospital.com',
    fullName: 'Pharmacist',
    hospitalId: 'hospital-1',
    roles: ['pharmacist'],
    permissions: ['patients:write'],
    onboardingCompleted: true,
  };

  const stockRepo = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  const prescriptionsRepo = {
    manager: {
      transaction: jest.fn(),
    },
  };

  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        { provide: getRepositoryToken(PharmacyStock), useValue: stockRepo },
        {
          provide: getRepositoryToken(Prescription),
          useValue: prescriptionsRepo,
        },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(PharmacyService);
  });

  it('decrements stock when dispensing a pending prescription', async () => {
    const prescription = {
      id: 'rx-1',
      hospitalId: 'hospital-1',
      status: 'pending',
      items: [{ drugName: 'Amoxicillin' }],
      patient: {
        id: 'p1',
        hospitalId: 'hospital-1',
        fullName: 'Pat',
        status: 'registered',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    const stock = {
      id: 's1',
      hospitalId: 'hospital-1',
      drugName: 'Amoxicillin',
      quantity: '5',
      unit: 'each',
    };

    prescriptionsRepo.manager.transaction.mockImplementation(
      (fn: (m: unknown) => Promise<unknown>) => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(stock),
        };
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Prescription) {
              return {
                findOne: jest.fn().mockResolvedValue(prescription),
                save: jest
                  .fn()
                  .mockResolvedValue({ ...prescription, status: 'dispensed' }),
              };
            }
            return {
              createQueryBuilder: jest.fn().mockReturnValue(qb),
              save: jest.fn().mockImplementation((s: { quantity: string }) => {
                stock.quantity = s.quantity;
                return Promise.resolve(stock);
              }),
            };
          },
        };
        return fn(manager);
      },
    );

    const result = await service.dispensePrescription(
      'hospital-1',
      { prescriptionId: 'rx-1' },
      actor,
    );

    expect(result.status).toBe('dispensed');
    expect(stock.quantity).toBe('4');
    expect(audit.log).toHaveBeenCalled();
  });

  it('rejects dispense when stock is missing', async () => {
    const prescription = {
      id: 'rx-1',
      hospitalId: 'hospital-1',
      status: 'pending',
      items: [{ drugName: 'UnknownDrug' }],
      patient: null,
    };

    prescriptionsRepo.manager.transaction.mockImplementation(
      (fn: (m: unknown) => Promise<unknown>) => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Prescription) {
              return {
                findOne: jest.fn().mockResolvedValue(prescription),
                save: jest.fn(),
              };
            }
            return {
              createQueryBuilder: jest.fn().mockReturnValue(qb),
              save: jest.fn(),
            };
          },
        };
        return fn(manager);
      },
    );

    await expect(
      service.dispensePrescription(
        'hospital-1',
        { prescriptionId: 'rx-1' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
