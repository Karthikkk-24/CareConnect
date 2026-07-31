import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Admission,
  Invoice,
  InvoiceItem,
  Patient,
  Payment,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  let service: BillingService;

  const manager = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
      id: 'pay-1',
      ...data,
    })),
  };

  const invoicesRepo = {
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    },
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const invoiceItemsRepo = { save: jest.fn(), create: jest.fn() };
  const paymentsRepo = {
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const patientsRepo = { findOne: jest.fn() };
  const admissionsRepo = { findOne: jest.fn() };
  const audit = { log: jest.fn() };

  const actor: AuthenticatedUser = {
    id: 'acct-1',
    authId: 'auth-1',
    email: 'acct@h.com',
    fullName: 'Accountant',
    hospitalId: 'hospital-a',
    roles: ['accountant'],
    permissions: ['billing:write'],
    onboardingCompleted: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Invoice), useValue: invoicesRepo },
        {
          provide: getRepositoryToken(InvoiceItem),
          useValue: invoiceItemsRepo,
        },
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: getRepositoryToken(Patient), useValue: patientsRepo },
        { provide: getRepositoryToken(Admission), useValue: admissionsRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(BillingService);
  });

  describe('recordPayment concurrency', () => {
    it('rejects payment that exceeds remaining balance under lock', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'inv-1',
          hospitalId: 'hospital-a',
          status: 'issued',
          totalAmount: '100.00',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.find.mockResolvedValue([{ amount: '100.00' }]);

      await expect(
        service.recordPayment(
          'hospital-a',
          { invoiceId: 'inv-1', amount: 50, method: 'cash' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('rejects payment on already-paid invoice', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'inv-1',
          hospitalId: 'hospital-a',
          status: 'paid',
          totalAmount: '100.00',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.recordPayment(
          'hospital-a',
          { invoiceId: 'inv-1', amount: 10, method: 'cash' },
          actor,
        ),
      ).rejects.toThrow('Invoice is already paid in full');
    });

    it('throws NotFound when invoice missing', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      manager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.recordPayment(
          'hospital-a',
          { invoiceId: 'missing', amount: 10, method: 'cash' },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
