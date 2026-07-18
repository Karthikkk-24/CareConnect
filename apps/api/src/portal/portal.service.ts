import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Appointment,
  LabOrder,
  LabResult,
  Patient,
  Prescription,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AppointmentsService } from '../appointments/appointments.service';
import { ClinicalService } from '../clinical/clinical.service';
import {
  PortalLabResultType,
  PortalPatientProfileType,
  PortalPatientRecordsType,
} from './portal.types';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Patient) private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(Appointment) private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Prescription)
    private readonly prescriptionsRepo: Repository<Prescription>,
    @InjectRepository(LabOrder) private readonly labOrdersRepo: Repository<LabOrder>,
    @InjectRepository(LabResult) private readonly labResultsRepo: Repository<LabResult>,
    private readonly appointmentsService: AppointmentsService,
    private readonly clinicalService: ClinicalService,
  ) {}

  private assertPatientRole(user: AuthenticatedUser) {
    if (user.roles.includes('super_admin')) return;
    if (!user.roles.includes('patient')) {
      throw new ForbiddenException('Patient portal access required');
    }
  }

  private async findLinkedPatient(user: AuthenticatedUser): Promise<Patient | null> {
    const byUserId = await this.patientsRepo.findOne({
      where: { userId: user.id },
    });
    if (byUserId) return byUserId;

    if (user.email) {
      return this.patientsRepo.findOne({
        where: { email: user.email },
      });
    }

    return null;
  }

  private toProfile(patient: Patient): PortalPatientProfileType {
    return {
      id: patient.id,
      fullName: patient.fullName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      status: patient.status,
    };
  }

  async portalPatientRecords(user: AuthenticatedUser): Promise<PortalPatientRecordsType> {
    this.assertPatientRole(user);

    const patient = await this.findLinkedPatient(user);
    if (!patient) {
      return { patient: undefined, appointments: [], prescriptions: [], labResults: [] };
    }

    const appointments = await this.appointmentsRepo.find({
      where: { patientId: patient.id, hospitalId: patient.hospitalId },
      order: { scheduledAt: 'DESC' },
    });

    const prescriptions = await this.prescriptionsRepo.find({
      where: { patientId: patient.id, hospitalId: patient.hospitalId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    const labOrders = await this.labOrdersRepo.find({
      where: { patientId: patient.id, hospitalId: patient.hospitalId },
      order: { createdAt: 'DESC' },
    });

    const labResults: PortalLabResultType[] = [];
    for (const order of labOrders) {
      const results = await this.labResultsRepo.find({
        where: { labOrderId: order.id, hospitalId: patient.hospitalId },
        order: { createdAt: 'DESC' },
      });

      for (const result of results) {
        labResults.push({
          id: result.id,
          labOrderId: order.id,
          testName: order.testName,
          resultValue: result.resultValue,
          referenceRange: result.referenceRange,
          unit: result.unit,
          completedAt: result.completedAt,
          createdAt: result.createdAt,
        });
      }
    }

    return {
      patient: this.toProfile(patient),
      appointments: appointments.map((a) => this.appointmentsService.toAppointmentType(a)),
      prescriptions: prescriptions.map((p) => this.clinicalService.toPrescriptionType(p)),
      labResults,
    };
  }
}
