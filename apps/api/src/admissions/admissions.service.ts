import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admission, Bed, Patient, Ward } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  AdmissionType,
  AdmitPatientInput,
  DischargeAdmissionInput,
  WardOccupancyType,
} from './admissions.types';

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(Admission) private readonly admissionsRepo: Repository<Admission>,
    @InjectRepository(Patient) private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(Ward) private readonly wardsRepo: Repository<Ward>,
    @InjectRepository(Bed) private readonly bedsRepo: Repository<Bed>,
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

  private async findAdmissionOrThrow(id: string, hospitalId: string): Promise<Admission> {
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
    const patient = await this.patientsRepo.findOne({
      where: { id: input.patientId, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const ward = await this.wardsRepo.findOne({ where: { id: input.wardId, hospitalId } });
    if (!ward) throw new NotFoundException('Ward not found');

    const bed = await this.bedsRepo.findOne({
      where: { id: input.bedId, wardId: input.wardId, hospitalId },
    });
    if (!bed) throw new NotFoundException('Bed not found');
    if (bed.status !== 'available') {
      throw new BadRequestException('Bed is not available');
    }

    const existingAdmission = await this.admissionsRepo.findOne({
      where: { patientId: input.patientId, hospitalId, status: 'active' },
    });
    if (existingAdmission) {
      throw new BadRequestException('Patient already has an active admission');
    }

    bed.status = 'occupied';
    await this.bedsRepo.save(bed);

    const saved = await this.admissionsRepo.save(
      this.admissionsRepo.create({
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
    await this.patientsRepo.save(patient);

    const admission = await this.findAdmissionOrThrow(saved.id, hospitalId);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'admit',
      resource: 'admission',
      resourceId: admission.id,
      metadata: { patientId: admission.patientId, bedId: admission.bedId },
    });

    return this.toAdmissionType(admission);
  }

  async activeAdmissions(hospitalId: string): Promise<AdmissionType[]> {
    const admissions = await this.admissionsRepo.find({
      where: { hospitalId, status: 'active' },
      relations: ['patient', 'attendingDoctor', 'ward', 'bed'],
      order: { admittedAt: 'DESC' },
    });
    return admissions.map((a) => this.toAdmissionType(a));
  }

  async dischargeAdmission(
    hospitalId: string,
    input: DischargeAdmissionInput,
    actor: AuthenticatedUser,
  ): Promise<AdmissionType> {
    const admission = await this.findAdmissionOrThrow(input.id, hospitalId);

    if (admission.status !== 'active') {
      throw new BadRequestException('Admission is not active');
    }

    admission.status = 'discharged';
    admission.dischargedAt = new Date();
    if (input.notes) {
      admission.reason = admission.reason
        ? `${admission.reason}\nDischarge notes: ${input.notes}`
        : input.notes;
    }

    if (admission.bedId) {
      const bed = await this.bedsRepo.findOne({
        where: { id: admission.bedId, hospitalId },
      });
      if (bed) {
        bed.status = 'available';
        await this.bedsRepo.save(bed);
      }
    }

    const saved = await this.admissionsRepo.save(admission);

    const patient = await this.patientsRepo.findOne({
      where: { id: admission.patientId, hospitalId },
    });
    if (patient) {
      patient.status = 'discharged';
      await this.patientsRepo.save(patient);
    }

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'discharge',
      resource: 'admission',
      resourceId: saved.id,
      metadata: { patientId: saved.patientId },
    });

    return this.toAdmissionType(saved);
  }

  async wardOccupancy(hospitalId: string): Promise<WardOccupancyType[]> {
    const wards = await this.wardsRepo.find({ where: { hospitalId } });
    const result: WardOccupancyType[] = [];

    for (const ward of wards) {
      const beds = await this.bedsRepo.find({ where: { wardId: ward.id, hospitalId } });
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
    return this.admissionsRepo.count({ where: { hospitalId, status: 'active' } });
  }
}
