import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  Admission,
  Bed,
  Discharge,
  FollowUp,
  Patient,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  CreateDischargeInput,
  CreateFollowUpInput,
  DischargeType,
  FollowUpType,
  UpdateFollowUpStatusInput,
} from './discharge.types';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { code?: string }).code === '23505'
  );
}

@Injectable()
export class DischargeService {
  constructor(
    @InjectRepository(Discharge)
    private readonly dischargesRepo: Repository<Discharge>,
    @InjectRepository(FollowUp)
    private readonly followUpsRepo: Repository<FollowUp>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
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

  toDischargeType(discharge: Discharge): DischargeType {
    return {
      id: discharge.id,
      hospitalId: discharge.hospitalId,
      admissionId: discharge.admissionId,
      patientId: discharge.patientId,
      dischargedById: discharge.dischargedById,
      summary: discharge.summary,
      medicationsAtDischarge: discharge.medicationsAtDischarge,
      instructions: discharge.instructions,
      dischargedAt: discharge.dischargedAt,
      createdAt: discharge.createdAt,
      updatedAt: discharge.updatedAt,
    };
  }

  toFollowUpType(followUp: FollowUp): FollowUpType {
    return {
      id: followUp.id,
      hospitalId: followUp.hospitalId,
      patientId: followUp.patientId,
      patientName: followUp.patient?.fullName,
      dischargeId: followUp.dischargeId,
      doctorId: followUp.doctorId,
      doctorName: followUp.doctor?.fullName,
      scheduledAt: followUp.scheduledAt,
      type: followUp.type,
      status: followUp.status,
      notes: followUp.notes,
      createdAt: followUp.createdAt,
      updatedAt: followUp.updatedAt,
    };
  }

  async createDischarge(
    hospitalId: string,
    input: CreateDischargeInput,
    actor: AuthenticatedUser,
  ): Promise<DischargeType> {
    try {
      const dischargeId = await this.dischargesRepo.manager.transaction(
        async (manager) => {
          const admission = await manager
            .createQueryBuilder(Admission, 'admission')
            .setLock('pessimistic_write')
            .where('admission.id = :id', { id: input.admissionId })
            .andWhere('admission.hospital_id = :hospitalId', { hospitalId })
            .getOne();
          if (!admission) throw new NotFoundException('Admission not found');

          const existing = await manager.findOne(Discharge, {
            where: { admissionId: admission.id },
          });
          if (existing) {
            throw new BadRequestException(
              'A discharge summary already exists for this admission',
            );
          }

          if (admission.status === 'active') {
            admission.status = 'discharged';
            admission.dischargedAt = new Date();
            await manager.save(admission);

            if (admission.bedId) {
              const bed = await manager.findOne(Bed, {
                where: { id: admission.bedId, hospitalId },
              });
              if (bed) {
                bed.status = 'available';
                await manager.save(bed);
              }
            }

            const patient = await manager.findOne(Patient, {
              where: { id: admission.patientId, hospitalId },
            });
            if (patient) {
              patient.status = 'discharged';
              await manager.save(patient);
            }
          } else if (admission.status !== 'discharged') {
            throw new BadRequestException(
              'Only active or already-discharged admissions can receive a discharge summary',
            );
          }

          const discharge = await manager.save(
            manager.create(Discharge, {
              hospitalId,
              admissionId: admission.id,
              patientId: admission.patientId,
              dischargedById: actor.id,
              summary: input.summary,
              medicationsAtDischarge: input.medicationsAtDischarge,
              instructions: input.instructions,
              dischargedAt: new Date(),
            }),
          );

          if (input.followUpScheduledAt) {
            await manager.save(
              manager.create(FollowUp, {
                hospitalId,
                patientId: admission.patientId,
                dischargeId: discharge.id,
                doctorId: input.followUpDoctorId ?? admission.attendingDoctorId,
                scheduledAt: new Date(input.followUpScheduledAt),
                type: input.followUpType ?? 'post_discharge',
                status: 'scheduled',
              }),
            );
          }

          return discharge.id;
        },
      );

      const discharge = await this.dischargesRepo.findOne({
        where: { id: dischargeId, hospitalId },
      });
      if (!discharge) throw new NotFoundException('Discharge not found');

      await this.audit.log({
        actorId: actor.id,
        hospitalId,
        action: 'create',
        resource: 'discharge',
        resourceId: discharge.id,
        metadata: {
          patientId: discharge.patientId,
          admissionId: discharge.admissionId,
        },
      });

      return this.toDischargeType(discharge);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A discharge summary already exists for this admission',
        );
      }
      throw error;
    }
  }

  async createFollowUp(
    hospitalId: string,
    input: CreateFollowUpInput,
    actor: AuthenticatedUser,
  ): Promise<FollowUpType> {
    const patient = await this.patientsRepo.findOne({
      where: { id: input.patientId, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    if (input.dischargeId) {
      const discharge = await this.dischargesRepo.findOne({
        where: { id: input.dischargeId, hospitalId },
      });
      if (!discharge) throw new NotFoundException('Discharge not found');
    }

    const followUp = await this.followUpsRepo.save(
      this.followUpsRepo.create({
        hospitalId,
        patientId: input.patientId,
        dischargeId: input.dischargeId,
        doctorId: input.doctorId,
        scheduledAt: new Date(input.scheduledAt),
        type: input.type,
        notes: input.notes,
        status: 'scheduled',
      }),
    );

    const withRelations = await this.followUpsRepo.findOne({
      where: { id: followUp.id },
      relations: ['patient', 'doctor'],
    });

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'follow_up',
      resourceId: followUp.id,
      metadata: { patientId: followUp.patientId },
    });

    return this.toFollowUpType(withRelations ?? followUp);
  }

  async updateFollowUpStatus(
    hospitalId: string,
    input: UpdateFollowUpStatusInput,
    actor: AuthenticatedUser,
  ): Promise<FollowUpType> {
    const followUp = await this.followUpsRepo.findOne({
      where: { id: input.id, hospitalId },
      relations: ['patient', 'doctor'],
    });
    if (!followUp) throw new NotFoundException('Follow-up not found');

    followUp.status = input.status;
    if (input.notes !== undefined) {
      followUp.notes = input.notes;
    }

    const saved = await this.followUpsRepo.save(followUp);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update',
      resource: 'follow_up',
      resourceId: saved.id,
      metadata: { status: saved.status },
    });

    return this.toFollowUpType(saved);
  }

  async followUps(
    hospitalId: string,
    status?: string,
  ): Promise<FollowUpType[]> {
    const where: { hospitalId: string; status?: string } = { hospitalId };
    if (status) where.status = status;

    const items = await this.followUpsRepo.find({
      where,
      relations: ['patient', 'doctor'],
      order: { scheduledAt: 'ASC' },
    });

    return items.map((item) => this.toFollowUpType(item));
  }

  async dischargesForPatient(
    hospitalId: string,
    patientId: string,
  ): Promise<DischargeType[]> {
    const patient = await this.patientsRepo.findOne({
      where: { id: patientId, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const discharges = await this.dischargesRepo.find({
      where: { hospitalId, patientId },
      order: { dischargedAt: 'DESC' },
    });

    return discharges.map((d) => this.toDischargeType(d));
  }
}
