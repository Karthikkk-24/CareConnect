import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, Department, Patient } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { HospitalDoctorValidator } from '../common/hospital-doctor.validator';
import {
  APPOINTMENT_STATUSES,
  AppointmentsPageType,
  AppointmentType,
  CancelAppointmentInput,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from './appointments.types';
import {
  paginatedList,
  resolvePagination,
  type PaginationInput,
} from '../common/dto/pagination.dto';

/**
 * Appointment status machine:
 *   scheduled → checked_in → completed
 *            ↘ cancelled / no_show
 *   checked_in → completed / cancelled / no_show
 * Terminal: completed, cancelled (immutable)
 * no_show can be revived to scheduled via reschedule (new slot).
 */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  scheduled: ['checked_in', 'cancelled', 'no_show', 'completed'],
  checked_in: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function assertTransition(from: string, to: string) {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition appointment from "${from}" to "${to}"`,
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
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(Department)
    private readonly departmentsRepo: Repository<Department>,
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

  toAppointmentType(appointment: Appointment): AppointmentType {
    return {
      id: appointment.id,
      hospitalId: appointment.hospitalId,
      patientId: appointment.patientId,
      patient: appointment.patient
        ? {
            id: appointment.patient.id,
            hospitalId: appointment.patient.hospitalId,
            fullName: appointment.patient.fullName,
            email: appointment.patient.email,
            phone: appointment.patient.phone,
            dateOfBirth: appointment.patient.dateOfBirth,
            gender: appointment.patient.gender,
            status: appointment.patient.status,
            createdAt: appointment.patient.createdAt,
            updatedAt: appointment.patient.updatedAt,
          }
        : undefined,
      doctorId: appointment.doctorId,
      doctor: appointment.doctor
        ? {
            id: appointment.doctor.id,
            fullName: appointment.doctor.fullName,
            email: appointment.doctor.email,
            avatarUrl: appointment.doctor.avatarUrl,
          }
        : undefined,
      departmentId: appointment.departmentId,
      scheduledAt: appointment.scheduledAt,
      reason: appointment.reason,
      status: appointment.status,
      notes: appointment.notes,
      createdById: appointment.createdById,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  private async findAppointmentOrThrow(
    id: string,
    hospitalId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentsRepo
      .createQueryBuilder('appointment')
      .innerJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .where('appointment.id = :id', { id })
      .andWhere('appointment.hospital_id = :hospitalId', { hospitalId })
      .andWhere('patient.deleted_at IS NULL')
      .getOne();
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async create(
    hospitalId: string,
    input: CreateAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentType> {
    const patient = await this.patientsRepo.findOne({
      where: { id: input.patientId, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    if (input.departmentId) {
      const department = await this.departmentsRepo.findOne({
        where: { id: input.departmentId, hospitalId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    await this.doctorValidator.assertHospitalDoctor(
      hospitalId,
      input.doctorId,
      'Doctor',
    );

    const saved = await this.appointmentsRepo.save(
      this.appointmentsRepo.create({
        hospitalId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        departmentId: input.departmentId,
        scheduledAt: new Date(input.scheduledAt),
        reason: input.reason,
        notes: input.notes,
        createdById: actor.id,
        status: 'scheduled',
      }),
    );

    const appointment = await this.findAppointmentOrThrow(saved.id, hospitalId);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'appointment',
      resourceId: appointment.id,
      metadata: { patientId: appointment.patientId },
    });

    return this.toAppointmentType(appointment);
  }

  async findAll(
    hospitalId: string,
    date?: string,
    doctorId?: string,
    status?: string,
    actor?: AuthenticatedUser,
    pagination?: PaginationInput,
  ): Promise<AppointmentsPageType> {
    const effectiveDoctorId = this.resolveDoctorScope(actor, doctorId);

    if (status) {
      if (
        !APPOINTMENT_STATUSES.includes(
          status as (typeof APPOINTMENT_STATUSES)[number],
        )
      ) {
        throw new BadRequestException(`Invalid appointment status: ${status}`);
      }
    }

    const appointments = this.appointmentsRepo
      .createQueryBuilder('appointment')
      .innerJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .where('appointment.hospital_id = :hospitalId', { hospitalId })
      .andWhere('patient.deleted_at IS NULL');

    if (effectiveDoctorId) {
      appointments.andWhere('appointment.doctor_id = :doctorId', {
        doctorId: effectiveDoctorId,
      });
    }
    if (status) {
      appointments.andWhere('appointment.status = :status', { status });
    }
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      appointments.andWhere(
        'appointment.scheduled_at BETWEEN :start AND :end',
        { start, end },
      );
    }

    const { page, limit, skip } = resolvePagination(pagination);
    const rowsAndCount = await appointments
      .orderBy('appointment.scheduled_at', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return paginatedList(
      rowsAndCount[0].map((a) => this.toAppointmentType(a)),
      rowsAndCount[1],
      page,
      limit,
    );
  }

  /**
   * Doctors without a hospital-wide schedule role only see their own appointments.
   * Reception/nurse/admin keep hospital-wide visibility.
   */
  private resolveDoctorScope(
    actor: AuthenticatedUser | undefined,
    requestedDoctorId?: string,
  ): string | undefined {
    if (!actor) return requestedDoctorId;
    const hospitalWide = actor.roles.some((role) =>
      [
        'super_admin',
        'hospital_admin',
        'hospital_manager',
        'receptionist',
        'nurse',
      ].includes(role),
    );
    if (!hospitalWide && actor.roles.includes('doctor')) {
      return actor.id;
    }
    return requestedDoctorId;
  }

  async updateStatus(
    id: string,
    status: string,
    hospitalId: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentType> {
    if (
      !APPOINTMENT_STATUSES.includes(
        status as (typeof APPOINTMENT_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(`Invalid appointment status: ${status}`);
    }

    const appointmentId = await this.appointmentsRepo.manager.transaction(
      async (manager) => {
        const appointment = await manager
          .createQueryBuilder(Appointment, 'appointment')
          .setLock('pessimistic_write')
          .where('appointment.id = :id', { id })
          .andWhere('appointment.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!appointment) throw new NotFoundException('Appointment not found');

        const patientAlive = await manager.findOne(Patient, {
          where: { id: appointment.patientId, hospitalId },
        });
        if (!patientAlive) throw new NotFoundException('Appointment not found');

        assertTransition(appointment.status, status);
        appointment.status = status;
        await manager.save(appointment);

        if (status === 'checked_in') {
          const patient = patientAlive;
          if (patient && patient.status === 'registered') {
            patient.status = 'checked_in';
            await manager.save(patient);
          }
        }

        return appointment.id;
      },
    );

    const saved = await this.findAppointmentOrThrow(appointmentId, hospitalId);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update_status',
      resource: 'appointment',
      resourceId: saved.id,
      metadata: { status },
    });

    return this.toAppointmentType(saved);
  }

  async cancel(
    hospitalId: string,
    input: CancelAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentType> {
    const appointmentId = await this.appointmentsRepo.manager.transaction(
      async (manager) => {
        const appointment = await manager
          .createQueryBuilder(Appointment, 'appointment')
          .setLock('pessimistic_write')
          .where('appointment.id = :id', { id: input.id })
          .andWhere('appointment.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!appointment) throw new NotFoundException('Appointment not found');

        const patientAlive = await manager.findOne(Patient, {
          where: { id: appointment.patientId, hospitalId },
        });
        if (!patientAlive) throw new NotFoundException('Appointment not found');

        assertTransition(appointment.status, 'cancelled');

        appointment.status = 'cancelled';
        if (input.reason) {
          appointment.notes = appointment.notes
            ? `${appointment.notes}\nCancelled: ${input.reason}`
            : `Cancelled: ${input.reason}`;
        }

        await manager.save(appointment);
        return appointment.id;
      },
    );

    const saved = await this.findAppointmentOrThrow(appointmentId, hospitalId);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'cancel',
      resource: 'appointment',
      resourceId: saved.id,
      metadata: { reason: input.reason },
    });

    return this.toAppointmentType(saved);
  }

  async reschedule(
    hospitalId: string,
    input: RescheduleAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentType> {
    const nextScheduledAt = parseIsoDate(input.scheduledAt, 'scheduledAt');

    const appointmentId = await this.appointmentsRepo.manager.transaction(
      async (manager) => {
        const appointment = await manager
          .createQueryBuilder(Appointment, 'appointment')
          .setLock('pessimistic_write')
          .where('appointment.id = :id', { id: input.id })
          .andWhere('appointment.hospital_id = :hospitalId', { hospitalId })
          .getOne();
        if (!appointment) throw new NotFoundException('Appointment not found');

        const patientAlive = await manager.findOne(Patient, {
          where: { id: appointment.patientId, hospitalId },
        });
        if (!patientAlive) throw new NotFoundException('Appointment not found');

        if (
          appointment.status === 'cancelled' ||
          appointment.status === 'completed'
        ) {
          throw new BadRequestException(
            `Cannot reschedule a ${appointment.status} appointment`,
          );
        }

        appointment.scheduledAt = nextScheduledAt;
        // A new slot is live again — revive no_show rather than leaving a dead status.
        if (appointment.status === 'no_show') {
          appointment.status = 'scheduled';
        }
        if (input.reason !== undefined) {
          appointment.reason = input.reason;
        }
        if (input.notes !== undefined) {
          appointment.notes = input.notes;
        }

        await manager.save(appointment);
        return appointment.id;
      },
    );

    const saved = await this.findAppointmentOrThrow(appointmentId, hospitalId);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'reschedule',
      resource: 'appointment',
      resourceId: saved.id,
      metadata: { scheduledAt: saved.scheduledAt.toISOString() },
    });

    return this.toAppointmentType(saved);
  }

  async countAppointmentsToday(hospitalId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.appointmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.patient', 'patient')
      .where('a.hospital_id = :hospitalId', { hospitalId })
      .andWhere('a.scheduled_at >= :start', { start: today })
      .andWhere('a.scheduled_at < :end', { end: tomorrow })
      .andWhere('a.status NOT IN (:...excluded)', { excluded: ['cancelled'] })
      .andWhere('patient.deleted_at IS NULL')
      .getCount();
  }
}
