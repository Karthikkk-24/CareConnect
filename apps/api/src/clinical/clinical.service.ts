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
  ClinicalNote,
  Diagnosis,
  LabOrder,
  LabResult,
  Patient,
  Prescription,
  PrescriptionItem,
  VitalSign,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  ClinicalNoteType,
  CompleteLabResultInput,
  CancelPrescriptionInput,
  CreateClinicalNoteInput,
  CreateDiagnosisInput,
  CreateLabOrderInput,
  CreatePrescriptionInput,
  CreateVitalInput,
  DiagnosisType,
  LabOrderType,
  LabResultType,
  PrescriptionType,
  UpdateLabOrderStatusInput,
  VitalSignType,
} from './clinical.types';

/**
 * Lab order status machine:
 *   ordered → collected → processing → completed
 *          ↘ cancelled (from ordered/collected/processing)
 * Terminal: completed, cancelled
 */
const LAB_ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  ordered: ['collected', 'processing', 'completed', 'cancelled'],
  collected: ['processing', 'completed', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Prescription status machine:
 *   pending → dispensed | cancelled
 * Terminal: dispensed, cancelled
 */
const PRESCRIPTION_ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['dispensed', 'cancelled'],
  dispensed: [],
  cancelled: [],
};

function assertLabTransition(from: string, to: string) {
  if (from === to) return;
  const allowed = LAB_ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition lab order from "${from}" to "${to}"`,
    );
  }
}

function assertPrescriptionTransition(from: string, to: string) {
  if (from === to) return;
  const allowed = PRESCRIPTION_ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition prescription from "${from}" to "${to}"`,
    );
  }
}

@Injectable()
export class ClinicalService {
  constructor(
    @InjectRepository(VitalSign)
    private readonly vitalsRepo: Repository<VitalSign>,
    @InjectRepository(Diagnosis)
    private readonly diagnosesRepo: Repository<Diagnosis>,
    @InjectRepository(ClinicalNote)
    private readonly notesRepo: Repository<ClinicalNote>,
    @InjectRepository(Prescription)
    private readonly prescriptionsRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly prescriptionItemsRepo: Repository<PrescriptionItem>,
    @InjectRepository(LabOrder)
    private readonly labOrdersRepo: Repository<LabOrder>,
    @InjectRepository(LabResult)
    private readonly labResultsRepo: Repository<LabResult>,
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

  private async assertPatient(
    hospitalId: string,
    patientId: string,
  ): Promise<Patient> {
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
  }

  toVitalType(vital: VitalSign): VitalSignType {
    return {
      id: vital.id,
      hospitalId: vital.hospitalId,
      patientId: vital.patientId,
      admissionId: vital.admissionId,
      recordedById: vital.recordedById,
      bloodPressure: vital.bloodPressure,
      heartRate: vital.heartRate,
      temperature:
        vital.temperature != null ? Number(vital.temperature) : undefined,
      spo2: vital.spo2,
      weight: vital.weight != null ? Number(vital.weight) : undefined,
      height: vital.height != null ? Number(vital.height) : undefined,
      notes: vital.notes,
      recordedAt: vital.recordedAt,
    };
  }

  toDiagnosisType(diagnosis: Diagnosis): DiagnosisType {
    return {
      id: diagnosis.id,
      hospitalId: diagnosis.hospitalId,
      patientId: diagnosis.patientId,
      admissionId: diagnosis.admissionId,
      doctorId: diagnosis.doctorId,
      icdCode: diagnosis.icdCode,
      description: diagnosis.description,
      isPrimary: diagnosis.isPrimary,
      diagnosedAt: diagnosis.diagnosedAt,
    };
  }

  toClinicalNoteType(note: ClinicalNote): ClinicalNoteType {
    return {
      id: note.id,
      hospitalId: note.hospitalId,
      patientId: note.patientId,
      admissionId: note.admissionId,
      authorId: note.authorId,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      createdAt: note.createdAt,
    };
  }

  toPrescriptionType(prescription: Prescription): PrescriptionType {
    return {
      id: prescription.id,
      hospitalId: prescription.hospitalId,
      patientId: prescription.patientId,
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

  toLabOrderType(order: LabOrder): LabOrderType {
    return {
      id: order.id,
      hospitalId: order.hospitalId,
      patientId: order.patientId,
      patient: order.patient
        ? {
            id: order.patient.id,
            hospitalId: order.patient.hospitalId,
            fullName: order.patient.fullName,
            email: order.patient.email,
            phone: order.patient.phone,
            dateOfBirth: order.patient.dateOfBirth,
            gender: order.patient.gender,
            status: order.patient.status,
            createdAt: order.patient.createdAt,
            updatedAt: order.patient.updatedAt,
          }
        : undefined,
      admissionId: order.admissionId,
      orderedById: order.orderedById,
      orderedBy: order.orderedBy
        ? {
            id: order.orderedBy.id,
            fullName: order.orderedBy.fullName,
            email: order.orderedBy.email,
            avatarUrl: order.orderedBy.avatarUrl,
          }
        : undefined,
      testName: order.testName,
      status: order.status,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  toLabResultType(result: LabResult): LabResultType {
    return {
      id: result.id,
      labOrderId: result.labOrderId,
      hospitalId: result.hospitalId,
      resultValue: result.resultValue,
      referenceRange: result.referenceRange,
      unit: result.unit,
      resultFileUrl: result.resultFileUrl,
      enteredById: result.enteredById,
      completedAt: result.completedAt,
      createdAt: result.createdAt,
    };
  }

  async createVital(
    hospitalId: string,
    input: CreateVitalInput,
    actor: AuthenticatedUser,
  ): Promise<VitalSignType> {
    await this.assertPatient(hospitalId, input.patientId);
    await this.assertAdmission(hospitalId, input.patientId, input.admissionId);

    const vital = await this.vitalsRepo.save(
      this.vitalsRepo.create({
        hospitalId,
        patientId: input.patientId,
        admissionId: input.admissionId,
        recordedById: actor.id,
        bloodPressure: input.bloodPressure,
        heartRate: input.heartRate,
        temperature: input.temperature,
        spo2: input.spo2,
        weight: input.weight,
        height: input.height,
        notes: input.notes,
        recordedAt: new Date(),
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'vital_sign',
      resourceId: vital.id,
      metadata: { patientId: vital.patientId },
    });

    return this.toVitalType(vital);
  }

  async createDiagnosis(
    hospitalId: string,
    input: CreateDiagnosisInput,
    actor: AuthenticatedUser,
  ): Promise<DiagnosisType> {
    await this.assertPatient(hospitalId, input.patientId);
    await this.assertAdmission(hospitalId, input.patientId, input.admissionId);

    const diagnosis = await this.diagnosesRepo.save(
      this.diagnosesRepo.create({
        hospitalId,
        patientId: input.patientId,
        admissionId: input.admissionId,
        doctorId: actor.id,
        icdCode: input.icdCode,
        description: input.description,
        isPrimary: input.isPrimary ?? false,
        diagnosedAt: new Date(),
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'diagnosis',
      resourceId: diagnosis.id,
      metadata: { patientId: diagnosis.patientId },
    });

    return this.toDiagnosisType(diagnosis);
  }

  async createClinicalNote(
    hospitalId: string,
    input: CreateClinicalNoteInput,
    actor: AuthenticatedUser,
  ): Promise<ClinicalNoteType> {
    await this.assertPatient(hospitalId, input.patientId);
    await this.assertAdmission(hospitalId, input.patientId, input.admissionId);

    const note = await this.notesRepo.save(
      this.notesRepo.create({
        hospitalId,
        patientId: input.patientId,
        admissionId: input.admissionId,
        authorId: actor.id,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'clinical_note',
      resourceId: note.id,
      metadata: { patientId: note.patientId },
    });

    return this.toClinicalNoteType(note);
  }

  async createPrescription(
    hospitalId: string,
    input: CreatePrescriptionInput,
    actor: AuthenticatedUser,
  ): Promise<PrescriptionType> {
    await this.assertPatient(hospitalId, input.patientId);
    await this.assertAdmission(hospitalId, input.patientId, input.admissionId);

    const prescription = await this.prescriptionsRepo.save(
      this.prescriptionsRepo.create({
        hospitalId,
        patientId: input.patientId,
        admissionId: input.admissionId,
        doctorId: actor.id,
        notes: input.notes,
        status: 'pending',
      }),
    );

    const items = await this.prescriptionItemsRepo.save(
      input.items.map((item) =>
        this.prescriptionItemsRepo.create({
          prescriptionId: prescription.id,
          drugName: item.drugName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
        }),
      ),
    );

    prescription.items = items;

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'prescription',
      resourceId: prescription.id,
      metadata: { patientId: prescription.patientId, itemCount: items.length },
    });

    return this.toPrescriptionType(prescription);
  }

  async createLabOrder(
    hospitalId: string,
    input: CreateLabOrderInput,
    actor: AuthenticatedUser,
  ): Promise<LabOrderType> {
    await this.assertPatient(hospitalId, input.patientId);
    await this.assertAdmission(hospitalId, input.patientId, input.admissionId);

    const order = await this.labOrdersRepo.save(
      this.labOrdersRepo.create({
        hospitalId,
        patientId: input.patientId,
        admissionId: input.admissionId,
        orderedById: actor.id,
        testName: input.testName,
        notes: input.notes,
        status: 'ordered',
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'lab_order',
      resourceId: order.id,
      metadata: { patientId: order.patientId, testName: order.testName },
    });

    return this.toLabOrderType(order);
  }

  async completeLabResult(
    hospitalId: string,
    input: CompleteLabResultInput,
    actor: AuthenticatedUser,
  ): Promise<LabResultType> {
    const resultId = await this.labOrdersRepo.manager.transaction(
      async (manager) => {
        const order = await manager
          .createQueryBuilder(LabOrder, 'order')
          .setLock('pessimistic_write')
          .where('order.id = :id', { id: input.labOrderId })
          .andWhere('order.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!order) throw new NotFoundException('Lab order not found');

        if (order.status === 'completed' || order.status === 'cancelled') {
          throw new BadRequestException(
            `Cannot complete lab order with status "${order.status}"`,
          );
        }
        assertLabTransition(order.status, 'completed');

        const result = await manager.save(
          manager.create(LabResult, {
            labOrderId: order.id,
            hospitalId,
            resultValue: input.resultValue,
            referenceRange: input.referenceRange,
            unit: input.unit,
            resultFileUrl: input.resultFileUrl,
            enteredById: actor.id,
            completedAt: new Date(),
          }),
        );

        order.status = 'completed';
        await manager.save(order);
        return result.id;
      },
    );

    const result = await this.labResultsRepo.findOne({
      where: { id: resultId, hospitalId },
    });
    if (!result) throw new NotFoundException('Lab result not found');

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'complete',
      resource: 'lab_result',
      resourceId: result.id,
      metadata: { labOrderId: input.labOrderId },
    });

    return this.toLabResultType(result);
  }

  async updateLabOrderStatus(
    hospitalId: string,
    input: UpdateLabOrderStatusInput,
    actor: AuthenticatedUser,
  ): Promise<LabOrderType> {
    // Completing requires a lab result via completeLabResult
    if (input.status === 'completed') {
      throw new BadRequestException(
        'Use completeLabResult to mark a lab order completed',
      );
    }

    const orderId = await this.labOrdersRepo.manager.transaction(
      async (manager) => {
        const order = await manager
          .createQueryBuilder(LabOrder, 'order')
          .setLock('pessimistic_write')
          .where('order.id = :id', { id: input.labOrderId })
          .andWhere('order.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!order) throw new NotFoundException('Lab order not found');

        assertLabTransition(order.status, input.status);
        order.status = input.status;
        await manager.save(order);
        return order.id;
      },
    );

    const order = await this.labOrdersRepo.findOne({
      where: { id: orderId, hospitalId },
      relations: ['patient', 'orderedBy'],
    });
    if (!order) throw new NotFoundException('Lab order not found');

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update',
      resource: 'lab_order',
      resourceId: order.id,
      metadata: { status: order.status },
    });

    return this.toLabOrderType(order);
  }

  async cancelPrescription(
    hospitalId: string,
    input: CancelPrescriptionInput,
    actor: AuthenticatedUser,
  ): Promise<PrescriptionType> {
    const prescriptionId = await this.prescriptionsRepo.manager.transaction(
      async (manager) => {
        const prescription = await manager
          .createQueryBuilder(Prescription, 'prescription')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('prescription.items', 'items')
          .where('prescription.id = :id', { id: input.prescriptionId })
          .andWhere('prescription.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!prescription)
          throw new NotFoundException('Prescription not found');

        assertPrescriptionTransition(prescription.status, 'cancelled');
        prescription.status = 'cancelled';
        await manager.save(prescription);
        return prescription.id;
      },
    );

    const prescription = await this.prescriptionsRepo.findOne({
      where: { id: prescriptionId, hospitalId },
      relations: ['items'],
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update',
      resource: 'prescription',
      resourceId: prescription.id,
      metadata: { status: 'cancelled' },
    });

    return this.toPrescriptionType(prescription);
  }

  async listLabOrders(
    hospitalId: string,
    status?: string,
  ): Promise<LabOrderType[]> {
    const where: { hospitalId: string; status?: string } = { hospitalId };
    if (status) where.status = status;
    const orders = await this.labOrdersRepo.find({
      where,
      relations: ['patient', 'orderedBy'],
      order: { createdAt: 'DESC' },
    });
    return orders.map((o) => this.toLabOrderType(o));
  }

  async listVitalSigns(
    hospitalId: string,
    patientId: string,
  ): Promise<VitalSignType[]> {
    await this.assertPatient(hospitalId, patientId);
    const rows = await this.vitalsRepo.find({
      where: { hospitalId, patientId },
      order: { recordedAt: 'DESC' },
      take: 50,
    });
    return rows.map((v) => this.toVitalType(v));
  }

  async listClinicalNotes(
    hospitalId: string,
    patientId: string,
  ): Promise<ClinicalNoteType[]> {
    await this.assertPatient(hospitalId, patientId);
    const rows = await this.notesRepo.find({
      where: { hospitalId, patientId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((n) => this.toClinicalNoteType(n));
  }

  async listDiagnoses(
    hospitalId: string,
    patientId: string,
  ): Promise<DiagnosisType[]> {
    await this.assertPatient(hospitalId, patientId);
    const rows = await this.diagnosesRepo.find({
      where: { hospitalId, patientId },
      order: { diagnosedAt: 'DESC' },
      take: 50,
    });
    return rows.map((d) => this.toDiagnosisType(d));
  }

  async listPrescriptions(
    hospitalId: string,
    patientId: string,
  ): Promise<PrescriptionType[]> {
    await this.assertPatient(hospitalId, patientId);
    const rows = await this.prescriptionsRepo.find({
      where: { hospitalId, patientId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((p) => this.toPrescriptionType(p));
  }
}
