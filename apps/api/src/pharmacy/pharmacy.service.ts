import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyStock, Prescription } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  DispensePrescriptionInput,
  PendingPrescriptionType,
  PharmacyStockType,
  UpsertPharmacyStockInput,
} from './pharmacy.types';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(PharmacyStock)
    private readonly pharmacyStockRepo: Repository<PharmacyStock>,
    @InjectRepository(Prescription)
    private readonly prescriptionsRepo: Repository<Prescription>,
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

  toPharmacyStockType(stock: PharmacyStock): PharmacyStockType {
    return {
      id: stock.id,
      hospitalId: stock.hospitalId,
      drugName: stock.drugName,
      quantity: this.toNumber(stock.quantity),
      unit: stock.unit,
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
    };
  }

  toPendingPrescriptionType(
    prescription: Prescription,
  ): PendingPrescriptionType {
    return {
      id: prescription.id,
      hospitalId: prescription.hospitalId,
      patientId: prescription.patientId,
      patient: prescription.patient
        ? {
            id: prescription.patient.id,
            hospitalId: prescription.patient.hospitalId,
            fullName: prescription.patient.fullName,
            email: prescription.patient.email,
            phone: prescription.patient.phone,
            dateOfBirth: prescription.patient.dateOfBirth,
            gender: prescription.patient.gender,
            status: prescription.patient.status,
            createdAt: prescription.patient.createdAt,
            updatedAt: prescription.patient.updatedAt,
          }
        : undefined,
      admissionId: prescription.admissionId,
      doctorId: prescription.doctorId,
      status: prescription.status,
      notes: prescription.notes,
      items: (prescription.items ?? []).map((item) => ({
        id: item.id,
        drugName: item.drugName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })),
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
    };
  }

  async listPharmacyStock(hospitalId: string): Promise<PharmacyStockType[]> {
    const stock = await this.pharmacyStockRepo.find({
      where: { hospitalId },
      order: { drugName: 'ASC' },
    });
    return stock.map((item) => this.toPharmacyStockType(item));
  }

  async upsertPharmacyStock(
    hospitalId: string,
    input: UpsertPharmacyStockInput,
    actor: AuthenticatedUser,
  ): Promise<PharmacyStockType> {
    const existing = await this.pharmacyStockRepo.findOne({
      where: { hospitalId, drugName: input.drugName },
    });

    const stock = existing
      ? await this.pharmacyStockRepo.save({
          ...existing,
          quantity: input.quantity.toFixed(2),
          unit: input.unit ?? existing.unit,
        })
      : await this.pharmacyStockRepo.save(
          this.pharmacyStockRepo.create({
            hospitalId,
            drugName: input.drugName,
            quantity: input.quantity.toFixed(2),
            unit: input.unit ?? 'each',
          }),
        );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: existing ? 'update' : 'create',
      resource: 'pharmacy_stock',
      resourceId: stock.id,
      metadata: { drugName: stock.drugName, quantity: input.quantity },
    });

    return this.toPharmacyStockType(stock);
  }

  async listPendingPrescriptions(
    hospitalId: string,
  ): Promise<PendingPrescriptionType[]> {
    const prescriptions = await this.prescriptionsRepo.find({
      where: { hospitalId, status: 'pending' },
      relations: ['items', 'patient'],
      order: { createdAt: 'ASC' },
    });
    return prescriptions.map((prescription) =>
      this.toPendingPrescriptionType(prescription),
    );
  }

  async dispensePrescription(
    hospitalId: string,
    input: DispensePrescriptionInput,
    actor: AuthenticatedUser,
  ): Promise<PendingPrescriptionType> {
    return this.prescriptionsRepo.manager.transaction(async (manager) => {
      const prescriptionsRepo = manager.getRepository(Prescription);
      const stockRepo = manager.getRepository(PharmacyStock);

      const prescription = await prescriptionsRepo.findOne({
        where: { id: input.prescriptionId, hospitalId },
        relations: ['items', 'patient'],
      });
      if (!prescription) throw new NotFoundException('Prescription not found');
      if (prescription.status !== 'pending') {
        throw new BadRequestException(
          'Only pending prescriptions can be dispensed',
        );
      }

      const items = prescription.items ?? [];
      for (const item of items) {
        const stock = await stockRepo
          .createQueryBuilder('stock')
          .where('stock.hospital_id = :hospitalId', { hospitalId })
          .andWhere('LOWER(stock.drug_name) = LOWER(:drugName)', {
            drugName: item.drugName,
          })
          .setLock('pessimistic_write')
          .getOne();

        if (!stock) {
          throw new BadRequestException(
            `No pharmacy stock for drug "${item.drugName}". Add stock before dispensing.`,
          );
        }

        const available = this.toNumber(stock.quantity);
        if (available < 1) {
          throw new BadRequestException(
            `Insufficient stock for "${item.drugName}" (available: ${available})`,
          );
        }

        stock.quantity = String(available - 1);
        await stockRepo.save(stock);
      }

      prescription.status = 'dispensed';
      const saved = await prescriptionsRepo.save(prescription);

      await this.audit.log({
        actorId: actor.id,
        hospitalId,
        action: 'update',
        resource: 'prescription',
        resourceId: saved.id,
        metadata: {
          status: 'dispensed',
          itemCount: items.length,
        },
      });

      return this.toPendingPrescriptionType(saved);
    });
  }
}
