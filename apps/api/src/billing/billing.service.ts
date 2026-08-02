import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Admission,
  Invoice,
  InvoiceItem,
  Patient,
  Payment,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  CreateInvoiceInput,
  InvoiceItemType,
  InvoiceType,
  PaymentType,
  RecordPaymentInput,
} from './billing.types';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemsRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(Admission)
    private readonly admissionsRepo: Repository<Admission>,
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

  toInvoiceItemType(item: InvoiceItem): InvoiceItemType {
    return {
      id: item.id,
      description: item.description,
      quantity: this.toNumber(item.quantity),
      unitPrice: this.toNumber(item.unitPrice),
      amount: this.toNumber(item.amount),
    };
  }

  toPaymentType(payment: Payment): PaymentType {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: this.toNumber(payment.amount),
      method: payment.method,
      paidAt: payment.paidAt,
      recordedById: payment.recordedById,
    };
  }

  toInvoiceType(invoice: Invoice): InvoiceType {
    return {
      id: invoice.id,
      hospitalId: invoice.hospitalId,
      patientId: invoice.patientId,
      patient: invoice.patient
        ? {
            id: invoice.patient.id,
            hospitalId: invoice.patient.hospitalId,
            fullName: invoice.patient.fullName,
            email: invoice.patient.email,
            phone: invoice.patient.phone,
            dateOfBirth: invoice.patient.dateOfBirth,
            gender: invoice.patient.gender,
            status: invoice.patient.status,
            createdAt: invoice.patient.createdAt,
            updatedAt: invoice.patient.updatedAt,
          }
        : undefined,
      admissionId: invoice.admissionId,
      status: invoice.status,
      totalAmount: this.toNumber(invoice.totalAmount),
      issuedAt: invoice.issuedAt,
      items: (invoice.items ?? []).map((item) => this.toInvoiceItemType(item)),
      payments: (invoice.payments ?? []).map((payment) =>
        this.toPaymentType(payment),
      ),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private async assertPatient(hospitalId: string, patientId: string) {
    const patient = await this.patientsRepo.findOne({
      where: { id: patientId, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  private async assertAdmission(
    hospitalId: string,
    patientId: string,
    admissionId?: string,
  ) {
    if (!admissionId) return;
    const admission = await this.admissionsRepo.findOne({
      where: { id: admissionId, hospitalId },
    });
    if (!admission) throw new NotFoundException('Admission not found');
    if (admission.patientId !== patientId) {
      throw new BadRequestException(
        'Admission does not belong to the given patient',
      );
    }
    if (admission.status !== 'active') {
      throw new BadRequestException(
        'Invoices can only be linked to an active admission',
      );
    }
  }

  async createInvoice(
    hospitalId: string,
    input: CreateInvoiceInput,
    actor: AuthenticatedUser,
  ): Promise<InvoiceType> {
    if (!input.items.length) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    await this.assertPatient(hospitalId, input.patientId);
    await this.assertAdmission(hospitalId, input.patientId, input.admissionId);

    const status = input.status ?? 'draft';
    if (status !== 'draft' && status !== 'issued') {
      throw new BadRequestException(
        'New invoices may only be draft or issued; mark paid via payments',
      );
    }
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const invoiceId = await this.invoicesRepo.manager.transaction(
      async (manager) => {
        const invoice = await manager.save(
          manager.create(Invoice, {
            hospitalId,
            patientId: input.patientId,
            admissionId: input.admissionId,
            status,
            totalAmount: totalAmount.toFixed(2),
            issuedAt: status === 'issued' ? new Date() : undefined,
          }),
        );

        await manager.save(
          input.items.map((item) =>
            manager.create(InvoiceItem, {
              invoiceId: invoice.id,
              description: item.description,
              quantity: item.quantity.toFixed(2),
              unitPrice: item.unitPrice.toFixed(2),
              amount: (item.quantity * item.unitPrice).toFixed(2),
            }),
          ),
        );

        return invoice.id;
      },
    );

    const invoice = await this.invoicesRepo.findOne({
      where: { id: invoiceId, hospitalId },
      relations: ['items', 'payments', 'patient'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'invoice',
      resourceId: invoice.id,
      metadata: { patientId: invoice.patientId, totalAmount },
    });

    return this.toInvoiceType(invoice);
  }

  async listInvoices(hospitalId: string): Promise<InvoiceType[]> {
    const invoices = await this.invoicesRepo.find({
      where: { hospitalId },
      relations: ['items', 'payments', 'patient'],
      order: { createdAt: 'DESC' },
    });
    return invoices.map((invoice) => this.toInvoiceType(invoice));
  }

  async getInvoice(hospitalId: string, id: string): Promise<InvoiceType> {
    const invoice = await this.invoicesRepo.findOne({
      where: { id, hospitalId },
      relations: ['items', 'payments', 'patient'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.toInvoiceType(invoice);
  }

  async recordPayment(
    hospitalId: string,
    input: RecordPaymentInput,
    actor: AuthenticatedUser,
  ): Promise<InvoiceType> {
    const paymentId = await this.invoicesRepo.manager.transaction(
      async (manager) => {
        // Lock invoice so concurrent payments serialize on the same row
        const invoice = await manager
          .createQueryBuilder(Invoice, 'invoice')
          .setLock('pessimistic_write')
          .where('invoice.id = :id', { id: input.invoiceId })
          .andWhere('invoice.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status === 'void') {
          throw new BadRequestException(
            'Cannot record payment on a void invoice',
          );
        }
        if (invoice.status === 'paid') {
          throw new BadRequestException('Invoice is already paid in full');
        }

        const payments = await manager.find(Payment, {
          where: { invoiceId: invoice.id },
        });
        const currentPaid = payments.reduce(
          (sum, p) => sum + this.toNumber(p.amount),
          0,
        );
        const invoiceTotal = this.toNumber(invoice.totalAmount);
        const remaining = Math.max(0, invoiceTotal - currentPaid);
        if (input.amount > remaining + 0.001) {
          throw new BadRequestException(
            `Payment exceeds remaining balance of ${remaining.toFixed(2)}`,
          );
        }

        const payment = await manager.save(
          manager.create(Payment, {
            invoiceId: invoice.id,
            hospitalId,
            amount: input.amount.toFixed(2),
            method: input.method,
            paidAt: new Date(),
            recordedById: actor.id,
          }),
        );

        const paidTotal = currentPaid + this.toNumber(payment.amount);
        if (paidTotal >= invoiceTotal) {
          invoice.status = 'paid';
        } else if (invoice.status === 'draft') {
          invoice.status = 'issued';
          invoice.issuedAt = invoice.issuedAt ?? new Date();
        }

        await manager.save(invoice);
        return payment.id;
      },
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'payment',
      resourceId: paymentId,
      metadata: { invoiceId: input.invoiceId, amount: input.amount },
    });

    return this.getInvoice(hospitalId, input.invoiceId);
  }

  async voidInvoice(
    hospitalId: string,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<InvoiceType> {
    await this.invoicesRepo.manager.transaction(async (manager) => {
      const invoice = await manager
        .createQueryBuilder(Invoice, 'invoice')
        .setLock('pessimistic_write')
        .where('invoice.id = :id', { id })
        .andWhere('invoice.hospital_id = :hospitalId', { hospitalId })
        .getOne();
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === 'void') {
        throw new BadRequestException('Invoice is already void');
      }
      if (invoice.status === 'paid') {
        throw new BadRequestException('Cannot void a paid invoice');
      }

      const paymentCount = await manager.count(Payment, {
        where: { invoiceId: invoice.id },
      });
      if (paymentCount > 0) {
        throw new BadRequestException(
          'Cannot void an invoice that has recorded payments',
        );
      }

      invoice.status = 'void';
      await manager.save(invoice);
    });

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'void',
      resource: 'invoice',
      resourceId: id,
    });
    return this.getInvoice(hospitalId, id);
  }

  async sumRevenue(hospitalId: string): Promise<number> {
    const result = await this.paymentsRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.hospital_id = :hospitalId', { hospitalId })
      .getRawOne<{ total: string }>();

    return this.toNumber(result?.total);
  }
}
