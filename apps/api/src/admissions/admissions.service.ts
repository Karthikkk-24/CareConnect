import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Admission, Bed, Patient, Ward } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { HospitalDoctorValidator } from '../common/hospital-doctor.validator';
import { DischargeService } from '../discharge/discharge.service';
import {
  AdmissionType,
  AdmitPatientInput,
  DischargeAdmissionInput,
  TransferAdmissionInput,
  TransferOutAdmissionInput,
  WardOccupancyType,
} from './admissions.types';

/**
 * Admission status machine:
 *   active → discharged (via discharge) | transferred (via transferOut)
 * Internal bed moves keep status active.
 * Terminal: discharged, transferred
 */
const ADMISSION_ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  active: ['discharged', 'transferred'],
  discharged: [],
  transferred: [],
};

function assertAdmissionTransition(from: string, to: string) {
  if (from === to) return;
  const allowed = ADMISSION_ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition admission from "${from}" to "${to}"`,
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof (error as QueryFailedError & { code?: string }).code === 'string' &&
    (error as QueryFailedError & { code?: string }).code === '23505'
  );
}

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(Admission)
    private readonly admissionsRepo: Repository<Admission>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(Ward) private readonly wardsRepo: Repository<Ward>,
    @InjectRepository(Bed) private readonly bedsRepo: Repository<Bed>,
    private readonly audit: AuditService,
    private readonly dischargeService: DischargeService,
    private readonly doctorValidator: HospitalDoctorValidator,
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

  toAdmissionType(admission: Admission): AdmissionType {
    return {
      id: admission.id,
      hospitalId: admission.hospitalId,
      patientId: admission.patientId,
      patient: admission.patient
        ? {
            id: admission.patient.id,
            hospitalId: admission.patient.hospitalId,
            fullName: admission.patient.fullName,
            email: admission.patient.email,
            phone: admission.patient.phone,
            dateOfBirth: admission.patient.dateOfBirth,
            gender: admission.patient.gender,
            status: admission.patient.status,
            createdAt: admission.patient.createdAt,
            updatedAt: admission.patient.updatedAt,
          }
        : undefined,
      attendingDoctorId: admission.attendingDoctorId,
      attendingDoctor: admission.attendingDoctor
        ? {
            id: admission.attendingDoctor.id,
            fullName: admission.attendingDoctor.fullName,
            email: admission.attendingDoctor.email,
            avatarUrl: admission.attendingDoctor.avatarUrl,
          }
        : undefined,
      wardId: admission.wardId,
      ward: admission.ward
        ? {
            id: admission.ward.id,
            hospitalId: admission.ward.hospitalId,
            departmentId: admission.ward.departmentId,
            name: admission.ward.name,
            floor: admission.ward.floor,
            createdAt: admission.ward.createdAt,
          }
        : undefined,
      bedId: admission.bedId,
      bed: admission.bed
        ? {
            id: admission.bed.id,
            hospitalId: admission.bed.hospitalId,
            wardId: admission.bed.wardId,
            label: admission.bed.label,
            status: admission.bed.status,
            createdAt: admission.bed.createdAt,
          }
        : undefined,
      admittedAt: admission.admittedAt,
      dischargedAt: admission.dischargedAt,
      reason: admission.reason,
      status: admission.status,
      createdAt: admission.createdAt,
      updatedAt: admission.updatedAt,
    };
  }

  private async findAdmissionOrThrow(
    id: string,
    hospitalId: string,
  ): Promise<Admission> {
    const admission = await this.admissionsRepo.findOne({
      where: { id, hospitalId },
      relations: ['patient', 'attendingDoctor', 'ward', 'bed'],
    });
    if (!admission) throw new NotFoundException('Admission not found');
    return admission;
  }

  async admitPatient(
    hospitalId: string,
    input: AdmitPatientInput,
    actor: AuthenticatedUser,
  ): Promise<AdmissionType> {
    try {
      const savedId = await this.admissionsRepo.manager.transaction(
        async (manager) => {
          // Lock patient before bed so admit serializes with soft-delete (#230).
          // Soft-deleted patients are excluded by TypeORM DeleteDateColumn.
          const patient = await manager
            .createQueryBuilder(Patient, 'patient')
            .setLock('pessimistic_write')
            .where('patient.id = :id', { id: input.patientId })
            .andWhere('patient.hospital_id = :hospitalId', { hospitalId })
            .getOne();
          if (!patient) throw new NotFoundException('Patient not found');

          const ward = await manager.findOne(Ward, {
            where: { id: input.wardId, hospitalId },
          });
          if (!ward) throw new NotFoundException('Ward not found');

          // Lock the bed row so concurrent admits serialize on the same bed
          const bed = await manager
            .createQueryBuilder(Bed, 'bed')
            .setLock('pessimistic_write')
            .where('bed.id = :id', { id: input.bedId })
            .andWhere('bed.ward_id = :wardId', { wardId: input.wardId })
            .andWhere('bed.hospital_id = :hospitalId', { hospitalId })
            .getOne();
          if (!bed) throw new NotFoundException('Bed not found');
          if (bed.status !== 'available') {
            throw new BadRequestException('Bed is not available');
          }

          await this.doctorValidator.assertHospitalDoctor(
            hospitalId,
            input.attendingDoctorId,
            'Attending doctor',
          );

          const existingAdmission = await manager.findOne(Admission, {
            where: {
              patientId: input.patientId,
              hospitalId,
              status: 'active',
            },
          });
          if (existingAdmission) {
            throw new BadRequestException(
              'Patient already has an active admission',
            );
          }

          bed.status = 'occupied';
          await manager.save(bed);

          const saved = await manager.save(
            manager.create(Admission, {
              hospitalId,
              patientId: input.patientId,
              attendingDoctorId: input.attendingDoctorId,
              wardId: input.wardId,
              bedId: input.bedId,
              reason: input.reason,
              status: 'active',
              admittedAt: new Date(),
            }),
          );

          patient.status = 'admitted';
          await manager.save(patient);

          return saved.id;
        },
      );

      const admission = await this.findAdmissionOrThrow(savedId, hospitalId);

      await this.audit.log({
        actorId: actor.id,
        hospitalId,
        action: 'admit',
        resource: 'admission',
        resourceId: admission.id,
        metadata: { patientId: admission.patientId, bedId: admission.bedId },
      });

      return this.toAdmissionType(admission);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'Bed is not available or patient already has an active admission',
        );
      }
      throw error;
    }
  }

  async activeAdmissions(hospitalId: string): Promise<AdmissionType[]> {
    const admissions = await this.admissionsRepo.find({
      where: { hospitalId, status: 'active' },
      relations: ['patient', 'attendingDoctor', 'ward', 'bed'],
      order: { admittedAt: 'DESC' },
      take: 200,
    });
    return admissions.map((a) => this.toAdmissionType(a));
  }

  async dischargeAdmission(
    hospitalId: string,
    input: DischargeAdmissionInput,
    actor: AuthenticatedUser,
  ): Promise<AdmissionType> {
    // Canonical path: always create a clinical discharge summary via DischargeService
    await this.dischargeService.createDischarge(
      hospitalId,
      {
        admissionId: input.id,
        summary: input.notes?.trim() || 'Discharged',
      },
      actor,
    );

    return this.toAdmissionType(
      await this.findAdmissionOrThrow(input.id, hospitalId),
    );
  }

  async transferAdmission(
    hospitalId: string,
    input: TransferAdmissionInput,
    actor: AuthenticatedUser,
  ): Promise<AdmissionType> {
    try {
      await this.admissionsRepo.manager.transaction(async (manager) => {
        const admission = await manager
          .createQueryBuilder(Admission, 'admission')
          .setLock('pessimistic_write')
          .where('admission.id = :id', { id: input.admissionId })
          .andWhere('admission.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!admission) throw new NotFoundException('Admission not found');
        if (admission.status !== 'active') {
          throw new BadRequestException(
            'Only active admissions can be transferred to another bed',
          );
        }

        const ward = await manager.findOne(Ward, {
          where: { id: input.wardId, hospitalId },
        });
        if (!ward) throw new NotFoundException('Ward not found');

        const newBed = await manager
          .createQueryBuilder(Bed, 'bed')
          .setLock('pessimistic_write')
          .where('bed.id = :id', { id: input.bedId })
          .andWhere('bed.ward_id = :wardId', { wardId: input.wardId })
          .andWhere('bed.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!newBed) throw new NotFoundException('Bed not found');
        if (newBed.status !== 'available') {
          throw new BadRequestException('Target bed is not available');
        }

        if (admission.bedId === newBed.id) {
          throw new BadRequestException(
            'Patient is already assigned to this bed',
          );
        }

        if (admission.bedId) {
          const oldBed = await manager
            .createQueryBuilder(Bed, 'bed')
            .setLock('pessimistic_write')
            .where('bed.id = :id', { id: admission.bedId })
            .andWhere('bed.hospital_id = :hospitalId', { hospitalId })
            .getOne();
          if (oldBed) {
            oldBed.status = 'available';
            await manager.save(oldBed);
          }
        }

        newBed.status = 'occupied';
        await manager.save(newBed);

        admission.wardId = input.wardId;
        admission.bedId = input.bedId;
        await manager.save(admission);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('Target bed is not available');
      }
      throw error;
    }

    const admission = await this.findAdmissionOrThrow(
      input.admissionId,
      hospitalId,
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'transfer',
      resource: 'admission',
      resourceId: admission.id,
      metadata: {
        wardId: admission.wardId,
        bedId: admission.bedId,
      },
    });

    return this.toAdmissionType(admission);
  }

  async transferOutAdmission(
    hospitalId: string,
    input: TransferOutAdmissionInput,
    actor: AuthenticatedUser,
  ): Promise<AdmissionType> {
    await this.admissionsRepo.manager.transaction(async (manager) => {
      const admission = await manager
        .createQueryBuilder(Admission, 'admission')
        .setLock('pessimistic_write')
        .where('admission.id = :id', { id: input.admissionId })
        .andWhere('admission.hospital_id = :hospitalId', { hospitalId })
        .getOne();
      if (!admission) throw new NotFoundException('Admission not found');

      assertAdmissionTransition(admission.status, 'transferred');

      if (admission.bedId) {
        const bed = await manager
          .createQueryBuilder(Bed, 'bed')
          .setLock('pessimistic_write')
          .where('bed.id = :id', { id: admission.bedId })
          .andWhere('bed.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (bed) {
          bed.status = 'available';
          await manager.save(bed);
        }
      }

      admission.status = 'transferred';
      admission.dischargedAt = new Date();
      if (input.notes) {
        admission.reason = admission.reason
          ? `${admission.reason}\nTransferred: ${input.notes}`
          : `Transferred: ${input.notes}`;
      }
      await manager.save(admission);

      const patient = await manager.findOne(Patient, {
        where: { id: admission.patientId, hospitalId },
      });
      if (patient) {
        patient.status = 'discharged';
        await manager.save(patient);
      }
    });

    const admission = await this.findAdmissionOrThrow(
      input.admissionId,
      hospitalId,
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'transfer_out',
      resource: 'admission',
      resourceId: admission.id,
      metadata: { status: 'transferred', notes: input.notes },
    });

    return this.toAdmissionType(admission);
  }

  async wardOccupancy(hospitalId: string): Promise<WardOccupancyType[]> {
    const wards = await this.wardsRepo.find({
      where: { hospitalId },
      take: 200,
    });
    const result: WardOccupancyType[] = [];

    for (const ward of wards) {
      const beds = await this.bedsRepo.find({
        where: { wardId: ward.id, hospitalId },
        take: 200,
      });
      const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;
      result.push({
        wardId: ward.id,
        wardName: ward.name,
        totalBeds: beds.length,
        occupiedBeds,
        availableBeds: beds.filter((b) => b.status === 'available').length,
      });
    }

    return result;
  }

  async countActive(hospitalId: string): Promise<number> {
    return this.admissionsRepo.count({
      where: { hospitalId, status: 'active' },
    });
  }
}
