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
    createQueryBuilder: jest.fn(),
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
          patientId: 'patient-1',
          status: 'issued',
          totalAmount: '100.00',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.find.mockResolvedValue([{ amount: '100.00' }]);
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-a',
      });

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
          patientId: 'patient-1',
          status: 'paid',
          totalAmount: '100.00',
        }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-a',
      });

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

  describe('createInvoice admission binding', () => {
    it('rejects when admission belongs to a different patient', async () => {
      patientsRepo.findOne.mockResolvedValue({
        id: 'patient-1',
        hospitalId: 'hospital-a',
      });
      admissionsRepo.findOne.mockResolvedValue({
        id: 'adm-1',
        hospitalId: 'hospital-a',
        patientId: 'patient-other',
      });

      await expect(
        service.createInvoice(
          'hospital-a',
          {
            patientId: 'patient-1',
            admissionId: 'adm-1',
            items: [{ description: 'Consult', quantity: 1, unitPrice: 50 }],
          },
          actor,
        ),
      ).rejects.toThrow('Admission does not belong to the given patient');
    });
  });

  describe('sumRevenue', () => {
    it('joins invoice and patient and excludes soft-deleted patients', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '125.50' }),
      };
      paymentsRepo.createQueryBuilder.mockReturnValue(qb);

      const total = await service.sumRevenue('hospital-a');

      expect(total).toBe(125.5);
      expect(qb.innerJoin).toHaveBeenCalledWith('payment.invoice', 'invoice');
      expect(qb.innerJoin).toHaveBeenCalledWith('invoice.patient', 'patient');
      expect(qb.andWhere).toHaveBeenCalledWith('patient.deleted_at IS NULL');
    });
  });

  describe('listInvoices pagination', () => {
    it('returns page metadata instead of silently truncating', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 201]),
      };
      invoicesRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listInvoices('hospital-a', {
        page: 1,
        limit: 50,
      });

      expect(qb.take).toHaveBeenCalledWith(50);
      expect(qb.take).not.toHaveBeenCalledWith(200);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(201);
      expect(result.limit).toBe(50);
    });
  });
});
