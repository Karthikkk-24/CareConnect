import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  Patient,
  PatientAllergy,
  PatientConsent,
  PatientDocument,
  PatientEmergencyContact,
  PatientImportJob,
  PatientInsurance,
  PatientMedicalHistory,
  PatientMedication,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  BulkPatientRowInput,
  CreatePatientInput,
  PatientDetailType,
  PatientDocumentInput,
  PatientType,
} from './patients.types';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly patientsRepo: Repository<Patient>,
    @InjectRepository(PatientEmergencyContact)
    private readonly emergencyRepo: Repository<PatientEmergencyContact>,
    @InjectRepository(PatientInsurance)
    private readonly insuranceRepo: Repository<PatientInsurance>,
    @InjectRepository(PatientAllergy)
    private readonly allergiesRepo: Repository<PatientAllergy>,
    @InjectRepository(PatientMedication)
    private readonly medicationsRepo: Repository<PatientMedication>,
    @InjectRepository(PatientMedicalHistory)
    private readonly historyRepo: Repository<PatientMedicalHistory>,
    @InjectRepository(PatientDocument)
    private readonly documentsRepo: Repository<PatientDocument>,
    @InjectRepository(PatientConsent)
    private readonly consentsRepo: Repository<PatientConsent>,
    @InjectRepository(PatientImportJob)
    private readonly importJobsRepo: Repository<PatientImportJob>,
  ) {}

  resolveHospitalId(user: AuthenticatedUser, hospitalId?: string): string {
    const id = hospitalId ?? user.hospitalId;
    if (!id) throw new NotFoundException('Hospital context required');
    return id;
  }

  toPatientType(patient: Patient): PatientType {
    return {
      id: patient.id,
      hospitalId: patient.hospitalId,
      fullName: patient.fullName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      country: patient.country,
      occupation: patient.occupation,
      identificationType: patient.identificationType,
      identificationNumber: patient.identificationNumber,
      primaryCarePhysician: patient.primaryCarePhysician,
      status: patient.status,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  async findAll(
    hospitalId: string,
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{ items: PatientType[]; total: number; page: number; limit: number }> {
    const where = search
      ? [
          { hospitalId, fullName: ILike(`%${search}%`) },
          { hospitalId, email: ILike(`%${search}%`) },
          { hospitalId, phone: ILike(`%${search}%`) },
        ]
      : { hospitalId };

    const [patients, total] = await this.patientsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: patients.map((p) => this.toPatientType(p)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string, hospitalId: string): Promise<PatientDetailType> {
    const patient = await this.patientsRepo.findOne({
      where: { id, hospitalId },
      relations: [
        'emergencyContacts',
        'insuranceRecords',
        'allergies',
        'medications',
        'medicalHistory',
        'documents',
        'consents',
      ],
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const insurance = patient.insuranceRecords?.[0];

    return {
      ...this.toPatientType(patient),
      emergencyContacts: patient.emergencyContacts ?? [],
      insuranceProvider: insurance?.provider,
      insurancePolicyNumber: insurance?.policyNumber,
      allergies: patient.allergies?.map((a) => a.allergen) ?? [],
      medications: patient.medications?.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`) ?? [],
      medicalHistory: (patient.medicalHistory ?? []).map((h) => ({
        id: h.id,
        type: h.type,
        condition: h.condition,
        diagnosisDate: h.diagnosisDate,
        relation: h.relation,
        notes: h.notes,
        createdAt: h.createdAt,
      })),
      documents: (patient.documents ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        fileUrl: d.fileUrl,
        fileType: d.fileType,
        documentType: d.documentType,
        createdAt: d.createdAt,
      })),
      consents: (patient.consents ?? []).map((c) => ({
        id: c.id,
        consentType: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt,
      })),
    };
  }

  async create(hospitalId: string, input: CreatePatientInput): Promise<PatientType> {
    const patient = await this.patientsRepo.save(
      this.patientsRepo.create({
        hospitalId,
        fullName: input.fullName,
        email: input.email || undefined,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        country: input.country,
        occupation: input.occupation,
        identificationType: input.identificationType,
        identificationNumber: input.identificationNumber,
        primaryCarePhysician: input.primaryCarePhysician,
      }),
    );

    await this.saveRelatedRecords(patient.id, input);
    return this.toPatientType(patient);
  }

  private async saveRelatedRecords(patientId: string, input: CreatePatientInput) {
    if (input.emergencyContacts?.length) {
      await this.emergencyRepo.save(
        input.emergencyContacts.map((c) =>
          this.emergencyRepo.create({ patientId, ...c }),
        ),
      );
    }

    if (input.insurance && (input.insurance.provider || input.insurance.policyNumber)) {
      await this.insuranceRepo.save(
        this.insuranceRepo.create({
          patientId,
          provider: input.insurance.provider,
          policyNumber: input.insurance.policyNumber,
          groupNumber: input.insurance.groupNumber,
        }),
      );
    }

    if (input.allergies?.length) {
      await this.allergiesRepo.save(
        input.allergies.map((a) => this.allergiesRepo.create({ patientId, ...a })),
      );
    }

    if (input.medications?.length) {
      await this.medicationsRepo.save(
        input.medications.map((m) => this.medicationsRepo.create({ patientId, ...m })),
      );
    }

    if (input.medicalHistory?.length) {
      await this.historyRepo.save(
        input.medicalHistory.map((h) => this.historyRepo.create({ patientId, ...h })),
      );
    }

    if (input.consents?.length) {
      await this.consentsRepo.save(
        input.consents.map((c) =>
          this.consentsRepo.create({
            patientId,
            consentType: c.consentType,
            granted: c.granted,
            grantedAt: c.granted ? new Date() : undefined,
          }),
        ),
      );
    }
  }

  async bulkImport(
    hospitalId: string,
    rows: BulkPatientRowInput[],
    userId: string,
    dryRun = false,
  ) {
    const errors: { row: number; message: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.fullName?.trim()) {
        errors.push({ row: rowNum, message: 'Full name is required' });
        continue;
      }

      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({ row: rowNum, message: 'Invalid email format' });
        continue;
      }

      if (!dryRun) {
        const input: CreatePatientInput = {
          fullName: row.fullName.trim(),
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.dateOfBirth,
          gender: this.normalizeGender(row.gender),
          bloodGroup: row.bloodGroup,
          address: row.address,
          city: row.city,
          identificationType: row.identificationType,
          identificationNumber: row.identificationNumber,
          emergencyContacts:
            row.emergencyContactName && row.emergencyContactPhone
              ? [{ name: row.emergencyContactName, phone: row.emergencyContactPhone }]
              : undefined,
          insurance:
            row.insuranceProvider || row.insurancePolicyNumber
              ? {
                  provider: row.insuranceProvider,
                  policyNumber: row.insurancePolicyNumber,
                }
              : undefined,
          allergies: row.allergies
            ? [{ allergen: row.allergies }]
            : undefined,
        };

        try {
          await this.create(hospitalId, input);
          successCount++;
        } catch (err) {
          errors.push({
            row: rowNum,
            message: err instanceof Error ? err.message : 'Failed to create patient',
          });
        }
      } else {
        successCount++;
      }
    }

    if (!dryRun) {
      await this.importJobsRepo.save(
        this.importJobsRepo.create({
          hospitalId,
          createdById: userId,
          status: errors.length === rows.length ? 'failed' : 'completed',
          totalRows: rows.length,
          successCount,
          errorCount: errors.length,
          errors,
          completedAt: new Date(),
        }),
      );
    }

    return {
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
      dryRun,
    };
  }

  private normalizeGender(gender?: string): string | undefined {
    if (!gender) return undefined;
    const g = gender.toLowerCase().trim();
    if (['male', 'm'].includes(g)) return 'male';
    if (['female', 'f'].includes(g)) return 'female';
    if (g === 'other') return 'other';
    return 'prefer_not_to_say';
  }

  async addDocument(
    patientId: string,
    hospitalId: string,
    input: PatientDocumentInput,
    uploadedById: string,
  ) {
    const patient = await this.patientsRepo.findOne({ where: { id: patientId, hospitalId } });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.documentsRepo.save(
      this.documentsRepo.create({
        patientId,
        name: input.name,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        documentType: input.documentType,
        uploadedById,
      }),
    );
  }
}
