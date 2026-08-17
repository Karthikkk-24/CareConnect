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
import { HospitalDoctorValidator } from '../common/hospital-doctor.validator';
import {
  CreateDischargeInput,
  CreateFollowUpInput,
  DischargeType,
  FollowUpType,
  RescheduleFollowUpInput,
  UpdateFollowUpStatusInput,
} from './discharge.types';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { code?: string }).code === '23505'
  );
}

/**
 * Follow-up status machine:
 *   scheduled → completed | missed
 *   rescheduled → scheduled | completed | missed (legacy rows only)
 * Terminal: completed (immutable)
 * missed can be revived to scheduled via rescheduleFollowUp (new due date).
 * Do not mark status "rescheduled" without a new date — use rescheduleFollowUp.
 */
const FOLLOW_UP_TRANSITIONS: Record<string, readonly string[]> = {
  scheduled: ['completed', 'missed'],
  rescheduled: ['scheduled', 'completed', 'missed'],
  completed: [],
  missed: [],
};

function assertFollowUpTransition(from: string, to: string) {
  if (from === to) return;
  if (to === 'rescheduled') {
    throw new BadRequestException(
      'Cannot mark a follow-up as rescheduled without a new date. Use rescheduleFollowUp.',
    );
  }
  const allowed = FOLLOW_UP_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition follow-up from "${from}" to "${to}"`,
    );
  }
}

function parseIsoDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return parsed;
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

            const patient = await manager.findOne(Patient, {
              where: { id: admission.patientId, hospitalId },
            });
            if (patient) {
              patient.status = 'discharged';
              await manager.save(patient);
            }
          } else if (
            admission.status !== 'discharged' &&
            admission.status !== 'transferred'
          ) {
            throw new BadRequestException(
              'Only active, transferred, or already-discharged admissions can receive a discharge summary',
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
            const followUpDoctorId =
              input.followUpDoctorId ?? admission.attendingDoctorId;
            if (!followUpDoctorId) {
              throw new BadRequestException(
                'Follow-up doctor is required when scheduling a follow-up',
              );
            }
            await this.doctorValidator.assertHospitalDoctor(
              hospitalId,
              followUpDoctorId,
              'Follow-up doctor',
            );
            await manager.save(
              manager.create(FollowUp, {
                hospitalId,
                patientId: admission.patientId,
                dischargeId: discharge.id,
                doctorId: followUpDoctorId,
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
      if (discharge.patientId !== input.patientId) {
        throw new BadRequestException(
          'Discharge does not belong to the given patient',
        );
      }
    }

    if (!input.doctorId) {
      throw new BadRequestException('Follow-up doctor is required');
    }
    await this.doctorValidator.assertHospitalDoctor(
      hospitalId,
      input.doctorId,
      'Follow-up doctor',
    );

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
    const followUpId = await this.followUpsRepo.manager.transaction(
      async (manager) => {
        const followUp = await manager
          .createQueryBuilder(FollowUp, 'followUp')
          .setLock('pessimistic_write')
          .where('followUp.id = :id', { id: input.id })
          .andWhere('followUp.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!followUp) throw new NotFoundException('Follow-up not found');

        const patient = await manager.findOne(Patient, {
          where: { id: followUp.patientId, hospitalId },
        });
        if (!patient) throw new NotFoundException('Follow-up not found');

        assertFollowUpTransition(followUp.status, input.status);
        followUp.status = input.status;
        if (input.notes !== undefined) {
          followUp.notes = input.notes;
        }
        await manager.save(followUp);
        return followUp.id;
      },
    );

    const saved = await this.followUpsRepo.findOne({
      where: { id: followUpId, hospitalId },
      relations: ['patient', 'doctor'],
    });
    if (!saved) throw new NotFoundException('Follow-up not found');

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

  async rescheduleFollowUp(
    hospitalId: string,
    input: RescheduleFollowUpInput,
    actor: AuthenticatedUser,
  ): Promise<FollowUpType> {
    const nextScheduledAt = parseIsoDate(input.scheduledAt, 'scheduledAt');

    const followUpId = await this.followUpsRepo.manager.transaction(
      async (manager) => {
        const followUp = await manager
          .createQueryBuilder(FollowUp, 'followUp')
          .setLock('pessimistic_write')
          .where('followUp.id = :id', { id: input.id })
          .andWhere('followUp.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!followUp) throw new NotFoundException('Follow-up not found');

        const patient = await manager.findOne(Patient, {
          where: { id: followUp.patientId, hospitalId },
        });
        if (!patient) throw new NotFoundException('Follow-up not found');

        if (followUp.status === 'completed') {
          throw new BadRequestException(
            'Cannot reschedule a completed follow-up',
          );
        }

        followUp.scheduledAt = nextScheduledAt;
        // Keep a live status with the new due date — never park on "rescheduled".
        followUp.status = 'scheduled';
        if (input.notes !== undefined) {
          followUp.notes = input.notes;
        }
        await manager.save(followUp);
        return followUp.id;
      },
    );

    const saved = await this.followUpsRepo.findOne({
      where: { id: followUpId, hospitalId },
      relations: ['patient', 'doctor'],
    });
    if (!saved) throw new NotFoundException('Follow-up not found');

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'reschedule',
      resource: 'follow_up',
      resourceId: saved.id,
      metadata: { scheduledAt: saved.scheduledAt.toISOString() },
    });

    return this.toFollowUpType(saved);
  }

  async followUps(
    hospitalId: string,
    status?: string,
  ): Promise<FollowUpType[]> {
    if (status && !(status in FOLLOW_UP_TRANSITIONS)) {
      throw new BadRequestException(`Invalid follow-up status "${status}"`);
    }

    const items = this.followUpsRepo
      .createQueryBuilder('followUp')
      .innerJoinAndSelect('followUp.patient', 'patient')
      .leftJoinAndSelect('followUp.doctor', 'doctor')
      .where('followUp.hospital_id = :hospitalId', { hospitalId })
      .andWhere('patient.deleted_at IS NULL');
    if (status) {
      items.andWhere('followUp.status = :status', { status });
    }
    const rows = await items
      .orderBy('followUp.scheduled_at', 'ASC')
      .take(200)
      .getMany();

    return rows.map((item) => this.toFollowUpType(item));
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
