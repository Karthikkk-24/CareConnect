import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment, Department, Patient } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  APPOINTMENT_STATUSES,
  AppointmentType,
  CancelAppointmentInput,
  CreateAppointmentInput,
} from './appointments.types';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Patient) private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(Department) private readonly departmentsRepo: Repository<Department>,
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

  toAppointmentType(appointment: Appointment): AppointmentType {
    return {
      id: appointment.id,
      hospitalId: appointment.hospitalId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
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

  private async findAppointmentOrThrow(id: string, hospitalId: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepo.findOne({ where: { id, hospitalId } });
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

    const appointment = await this.appointmentsRepo.save(
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
  ): Promise<AppointmentType[]> {
    const where: Record<string, unknown> = { hospitalId };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt = Between(start, end);
    }

    const appointments = await this.appointmentsRepo.find({
      where,
      order: { scheduledAt: 'ASC' },
    });

    return appointments.map((a) => this.toAppointmentType(a));
  }

  async updateStatus(
    id: string,
    status: string,
    hospitalId: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentType> {
    if (!APPOINTMENT_STATUSES.includes(status as (typeof APPOINTMENT_STATUSES)[number])) {
      throw new BadRequestException(`Invalid appointment status: ${status}`);
    }

    const appointment = await this.findAppointmentOrThrow(id, hospitalId);
    appointment.status = status;
    const saved = await this.appointmentsRepo.save(appointment);

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
    const appointment = await this.findAppointmentOrThrow(input.id, hospitalId);

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Appointment is already cancelled');
    }

    appointment.status = 'cancelled';
    if (input.reason) {
      appointment.notes = appointment.notes
        ? `${appointment.notes}\nCancelled: ${input.reason}`
        : `Cancelled: ${input.reason}`;
    }

    const saved = await this.appointmentsRepo.save(appointment);

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

  async countAppointmentsToday(hospitalId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.hospital_id = :hospitalId', { hospitalId })
      .andWhere('a.scheduled_at >= :start', { start: today })
      .andWhere('a.scheduled_at < :end', { end: tomorrow })
      .andWhere('a.status NOT IN (:...excluded)', { excluded: ['cancelled'] })
      .getCount();
  }
}
