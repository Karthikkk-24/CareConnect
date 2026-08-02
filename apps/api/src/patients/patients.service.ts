import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { ILike, EntityManager, Repository } from 'typeorm';
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
  Admission,
  User,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  BulkPatientRowInput,
  CreatePatientInput,
  PATIENT_STATUSES,
  PatientDetailType,
  PatientDocumentInput,
  PatientType,
  UpdatePatientInput,
} from './patients.types';

type PatientRelatedInput = Pick<
  CreatePatientInput,
  | 'emergencyContacts'
  | 'insurance'
  | 'allergies'
  | 'medications'
  | 'medicalHistory'
  | 'consents'
>;

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
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
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
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
  ): Promise<{
    items: PatientType[];
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
    if (search) {
      const literal = search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      const pattern = `%${literal}%`;
      const qb = this.patientsRepo
        .createQueryBuilder('patient')
        .where('patient.hospital_id = :hospitalId', { hospitalId })
        .andWhere(
          `(patient.full_name ILIKE :pattern ESCAPE '\\' OR patient.email ILIKE :pattern ESCAPE '\\' OR patient.phone ILIKE :pattern ESCAPE '\\')`,
          { pattern },
        )
        .orderBy('patient.created_at', 'DESC')
        .skip((safePage - 1) * safeLimit)
        .take(safeLimit);

      const [patients, total] = await qb.getManyAndCount();
      return {
        items: patients.map((p) => this.toPatientType(p)),
        total,
        page: safePage,
        limit: safeLimit,
      };
    }

    const [patients, total] = await this.patientsRepo.findAndCount({
      where: { hospitalId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      items: patients.map((p) => this.toPatientType(p)),
      total,
      page: safePage,
      limit: safeLimit,
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
      medications:
        patient.medications?.map(
          (m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`,
        ) ?? [],
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

  private async findPatientOrThrow(
    id: string,
    hospitalId: string,
  ): Promise<Patient> {
    const patient = await this.patientsRepo.findOne({
      where: { id, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  private async assertNoDuplicates(
    hospitalId: string,
    fields: { email?: string; phone?: string; identificationNumber?: string },
    excludePatientId?: string,
  ) {
    const conflicts: string[] = [];

    if (fields.email?.trim()) {
      const qb = this.patientsRepo
        .createQueryBuilder('p')
        .where('p.hospital_id = :hospitalId', { hospitalId })
        .andWhere('LOWER(p.email) = LOWER(:email)', {
          email: fields.email.trim(),
        });
      if (excludePatientId) {
        qb.andWhere('p.id != :excludePatientId', { excludePatientId });
      }
      if (await qb.getOne()) conflicts.push('email');
    }

    if (fields.phone?.trim()) {
      const qb = this.patientsRepo
        .createQueryBuilder('p')
        .where('p.hospital_id = :hospitalId', { hospitalId })
        .andWhere('p.phone = :phone', { phone: fields.phone.trim() });
      if (excludePatientId) {
        qb.andWhere('p.id != :excludePatientId', { excludePatientId });
      }
      if (await qb.getOne()) conflicts.push('phone');
    }

    if (fields.identificationNumber?.trim()) {
      const qb = this.patientsRepo
        .createQueryBuilder('p')
        .where('p.hospital_id = :hospitalId', { hospitalId })
        .andWhere('p.identification_number = :identificationNumber', {
          identificationNumber: fields.identificationNumber.trim(),
        });
      if (excludePatientId) {
        qb.andWhere('p.id != :excludePatientId', { excludePatientId });
      }
      if (await qb.getOne()) conflicts.push('identification number');
    }

    if (conflicts.length) {
      throw new ConflictException(
        `A patient with the same ${conflicts.join(', ')} already exists in this hospital`,
      );
    }
  }

  async create(
    hospitalId: string,
    input: CreatePatientInput,
    actor: AuthenticatedUser,
  ): Promise<PatientType> {
    await this.assertNoDuplicates(hospitalId, {
      email: input.email,
      phone: input.phone,
      identificationNumber: input.identificationNumber,
    });

    const patientId = await this.patientsRepo.manager.transaction(
      async (manager) => {
        const patient = await manager.save(
          manager.create(Patient, {
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

        await this.saveRelatedRecords(patient.id, input, manager);
        return patient.id;
      },
    );

    const patient = await this.findPatientOrThrow(patientId, hospitalId);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'patient',
      resourceId: patient.id,
      metadata: { fullName: patient.fullName },
    });

    return this.toPatientType(patient);
  }

  async updatePatient(
    id: string,
    input: UpdatePatientInput,
    hospitalId: string,
    actor: AuthenticatedUser,
  ): Promise<PatientType> {
    const patient = await this.findPatientOrThrow(id, hospitalId);

    const nextEmail = input.email !== undefined ? input.email : patient.email;
    const nextPhone = input.phone !== undefined ? input.phone : patient.phone;
    const nextIdentificationNumber =
      input.identificationNumber !== undefined
        ? input.identificationNumber
        : patient.identificationNumber;

    await this.assertNoDuplicates(
      hospitalId,
      {
        email: nextEmail,
        phone: nextPhone,
        identificationNumber: nextIdentificationNumber,
      },
      id,
    );

    Object.assign(patient, {
      fullName: input.fullName ?? patient.fullName,
      email:
        input.email !== undefined ? input.email || undefined : patient.email,
      phone: input.phone ?? patient.phone,
      dateOfBirth: input.dateOfBirth ?? patient.dateOfBirth,
      gender: input.gender ?? patient.gender,
      bloodGroup: input.bloodGroup ?? patient.bloodGroup,
      address: input.address ?? patient.address,
      city: input.city ?? patient.city,
      state: input.state ?? patient.state,
      zipCode: input.zipCode ?? patient.zipCode,
      country: input.country ?? patient.country,
      occupation: input.occupation ?? patient.occupation,
      identificationType:
        input.identificationType ?? patient.identificationType,
      identificationNumber:
        input.identificationNumber ?? patient.identificationNumber,
      primaryCarePhysician:
        input.primaryCarePhysician ?? patient.primaryCarePhysician,
    });

    const saved = await this.patientsRepo.manager.transaction(
      async (manager) => {
        const row = await manager.save(patient);
        await this.replaceRelatedRecords(row.id, input, manager);
        return row;
      },
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update',
      resource: 'patient',
      resourceId: saved.id,
    });

    return this.toPatientType(saved);
  }

  async deletePatient(
    id: string,
    hospitalId: string,
    actor: AuthenticatedUser,
  ): Promise<boolean> {
    const patient = await this.findPatientOrThrow(id, hospitalId);

    const activeAdmission = await this.admissionsRepo.findOne({
      where: { patientId: id, hospitalId, status: 'active' },
    });
    if (activeAdmission) {
      throw new BadRequestException(
        'Cannot delete a patient with an active admission; discharge first',
      );
    }

    // Soft-delete policy: soft-remove the patient row; hard-remove linked
    // document metadata and unlink PHI files from disk. Other related rows
    // remain for audit but are unreachable via patient queries.
    const documents = await this.documentsRepo.find({
      where: { patientId: id },
    });
    for (const document of documents) {
      const fileUrl = document.fileUrl;
      await this.documentsRepo.remove(document);
      this.unlinkStoredUpload(fileUrl);
    }

    await this.patientsRepo.softRemove(patient);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete',
      resource: 'patient',
      resourceId: patient.id,
      metadata: {
        fullName: patient.fullName,
        documentsRemoved: documents.length,
      },
    });

    return true;
  }

  async updatePatientStatus(
    id: string,
    status: string,
    hospitalId: string,
    actor: AuthenticatedUser,
  ): Promise<PatientType> {
    if (
      !PATIENT_STATUSES.includes(status as (typeof PATIENT_STATUSES)[number])
    ) {
      throw new BadRequestException(`Invalid patient status: ${status}`);
    }

    const patient = await this.findPatientOrThrow(id, hospitalId);

    const activeAdmission = await this.admissionsRepo.findOne({
      where: { patientId: id, hospitalId, status: 'active' },
    });

    if (activeAdmission) {
      if (status !== 'admitted') {
        throw new BadRequestException(
          'Patient has an active admission; discharge the admission before changing status',
        );
      }
    } else if (status === 'admitted') {
      throw new BadRequestException(
        'Cannot mark patient admitted without an active admission',
      );
    }

    patient.status = status;
    const saved = await this.patientsRepo.save(patient);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'update_status',
      resource: 'patient',
      resourceId: saved.id,
      metadata: { status },
    });

    return this.toPatientType(saved);
  }

  async deletePatientDocument(
    id: string,
    patientId: string,
    hospitalId: string,
    actor: AuthenticatedUser,
  ): Promise<boolean> {
    await this.findPatientOrThrow(patientId, hospitalId);

    const document = await this.documentsRepo.findOne({
      where: { id, patientId },
    });
    if (!document) throw new NotFoundException('Patient document not found');

    const fileUrl = document.fileUrl;
    await this.documentsRepo.remove(document);
    this.unlinkStoredUpload(fileUrl);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete_document',
      resource: 'patient_document',
      resourceId: document.id,
      metadata: { patientId, name: document.name },
    });

    return true;
  }

  /** Remove PHI file from local uploads/ when the document row is deleted. */
  private unlinkStoredUpload(fileUrl: string | undefined) {
    if (!fileUrl) return;
    try {
      const marker = '/uploads/';
      const idx = fileUrl.lastIndexOf(marker);
      const rawName =
        idx >= 0 ? fileUrl.slice(idx + marker.length) : basename(fileUrl);
      const safe = basename(rawName.split('?')[0] ?? '');
      if (!safe || safe.includes('..')) return;
      const path = join(process.cwd(), 'uploads', safe);
      if (existsSync(path)) {
        unlinkSync(path);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to delete upload file for ${fileUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async linkPatientAccount(
    patientId: string,
    hospitalId: string,
    actor: AuthenticatedUser,
    userId?: string,
    email?: string,
  ): Promise<PatientType> {
    const patient = await this.findPatientOrThrow(patientId, hospitalId);

    let targetUserId = userId;
    const lookupEmail =
      email?.trim().toLowerCase() || patient.email?.toLowerCase();

    let targetUser: User | null = null;
    if (targetUserId) {
      targetUser = await this.usersRepo.findOne({
        where: { id: targetUserId },
        relations: ['userRoles', 'userRoles.role'],
      });
    } else if (lookupEmail) {
      targetUser = await this.usersRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userRoles', 'userRoles')
        .leftJoinAndSelect('userRoles.role', 'role')
        .where('LOWER(user.email) = :email', { email: lookupEmail })
        .getOne();
      if (!targetUser) {
        throw new NotFoundException(
          `No CareConnect user found for email ${lookupEmail}. Ask the patient to register first.`,
        );
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId || !targetUser) {
      throw new BadRequestException(
        'Provide a portal user email or userId to link (cannot default to staff account)',
      );
    }

    const hasPatientRole = (targetUser.userRoles ?? []).some(
      (ur) => ur.role?.slug === 'patient',
    );
    if (!hasPatientRole) {
      throw new BadRequestException(
        'Only users with the patient role can be linked to a patient chart',
      );
    }

    patient.userId = targetUserId;
    const saved = await this.patientsRepo.save(patient);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'link_account',
      resource: 'patient',
      resourceId: saved.id,
      metadata: { userId: targetUserId, email: lookupEmail },
    });

    return this.toPatientType(saved);
  }

  private async saveRelatedRecords(
    patientId: string,
    input: PatientRelatedInput,
    manager?: EntityManager,
  ) {
    const emergencyRepo = manager
      ? manager.getRepository(PatientEmergencyContact)
      : this.emergencyRepo;
    const insuranceRepo = manager
      ? manager.getRepository(PatientInsurance)
      : this.insuranceRepo;
    const allergiesRepo = manager
      ? manager.getRepository(PatientAllergy)
      : this.allergiesRepo;
    const medicationsRepo = manager
      ? manager.getRepository(PatientMedication)
      : this.medicationsRepo;
    const historyRepo = manager
      ? manager.getRepository(PatientMedicalHistory)
      : this.historyRepo;
    const consentsRepo = manager
      ? manager.getRepository(PatientConsent)
      : this.consentsRepo;

    if (input.emergencyContacts?.length) {
      await emergencyRepo.save(
        input.emergencyContacts.map((c) =>
          emergencyRepo.create({ patientId, ...c }),
        ),
      );
    }

    if (
      input.insurance &&
      (input.insurance.provider || input.insurance.policyNumber)
    ) {
      await insuranceRepo.save(
        insuranceRepo.create({
          patientId,
          provider: input.insurance.provider,
          policyNumber: input.insurance.policyNumber,
          groupNumber: input.insurance.groupNumber,
        }),
      );
    }

    if (input.allergies?.length) {
      await allergiesRepo.save(
        input.allergies.map((a) => allergiesRepo.create({ patientId, ...a })),
      );
    }

    if (input.medications?.length) {
      await medicationsRepo.save(
        input.medications.map((m) =>
          medicationsRepo.create({ patientId, ...m }),
        ),
      );
    }

    if (input.medicalHistory?.length) {
      await historyRepo.save(
        input.medicalHistory.map((h) =>
          historyRepo.create({ patientId, ...h }),
        ),
      );
    }

    if (input.consents?.length) {
      await consentsRepo.save(
        input.consents.map((c) =>
          consentsRepo.create({
            patientId,
            consentType: c.consentType,
            granted: c.granted,
            grantedAt: c.granted ? new Date() : undefined,
          }),
        ),
      );
    }
  }

  private async replaceRelatedRecords(
    patientId: string,
    input: UpdatePatientInput,
    manager?: EntityManager,
  ) {
    const emergencyRepo = manager
      ? manager.getRepository(PatientEmergencyContact)
      : this.emergencyRepo;
    const insuranceRepo = manager
      ? manager.getRepository(PatientInsurance)
      : this.insuranceRepo;
    const allergiesRepo = manager
      ? manager.getRepository(PatientAllergy)
      : this.allergiesRepo;
    const medicationsRepo = manager
      ? manager.getRepository(PatientMedication)
      : this.medicationsRepo;
    const historyRepo = manager
      ? manager.getRepository(PatientMedicalHistory)
      : this.historyRepo;
    const consentsRepo = manager
      ? manager.getRepository(PatientConsent)
      : this.consentsRepo;

    if (input.emergencyContacts !== undefined) {
      await emergencyRepo.delete({ patientId });
      if (input.emergencyContacts.length) {
        await emergencyRepo.save(
          input.emergencyContacts.map((c) =>
            emergencyRepo.create({ patientId, ...c }),
          ),
        );
      }
    }

    if (input.insurance !== undefined) {
      await insuranceRepo.delete({ patientId });
      if (
        input.insurance.provider ||
        input.insurance.policyNumber ||
        input.insurance.groupNumber
      ) {
        await insuranceRepo.save(
          insuranceRepo.create({
            patientId,
            provider: input.insurance.provider,
            policyNumber: input.insurance.policyNumber,
            groupNumber: input.insurance.groupNumber,
          }),
        );
      }
    }

    if (input.allergies !== undefined) {
      await allergiesRepo.delete({ patientId });
      if (input.allergies.length) {
        await allergiesRepo.save(
          input.allergies.map((a) => allergiesRepo.create({ patientId, ...a })),
        );
      }
    }

    if (input.medications !== undefined) {
      await medicationsRepo.delete({ patientId });
      if (input.medications.length) {
        await medicationsRepo.save(
          input.medications.map((m) =>
            medicationsRepo.create({ patientId, ...m }),
          ),
        );
      }
    }

    if (input.medicalHistory !== undefined) {
      await historyRepo.delete({ patientId });
      if (input.medicalHistory.length) {
        await historyRepo.save(
          input.medicalHistory.map((h) =>
            historyRepo.create({ patientId, ...h }),
          ),
        );
      }
    }

    if (input.consents !== undefined) {
      await consentsRepo.delete({ patientId });
      if (input.consents.length) {
        await consentsRepo.save(
          input.consents.map((c) =>
            consentsRepo.create({
              patientId,
              consentType: c.consentType,
              granted: c.granted,
              grantedAt: c.granted ? new Date() : undefined,
            }),
          ),
        );
      }
    }
  }

  async bulkImport(
    hospitalId: string,
    rows: BulkPatientRowInput[],
    userId: string,
    dryRun = false,
  ) {
    if (rows.length > 500) {
      throw new BadRequestException(
        'Bulk import is limited to 500 rows per request',
      );
    }
    const actor = { id: userId } as AuthenticatedUser;
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
              ? [
                  {
                    name: row.emergencyContactName,
                    phone: row.emergencyContactPhone,
                  },
                ]
              : undefined,
          insurance:
            row.insuranceProvider || row.insurancePolicyNumber
              ? {
                  provider: row.insuranceProvider,
                  policyNumber: row.insurancePolicyNumber,
                }
              : undefined,
          allergies: row.allergies ? [{ allergen: row.allergies }] : undefined,
        };

        try {
          await this.create(hospitalId, input, actor);
          successCount++;
        } catch (err) {
          errors.push({
            row: rowNum,
            message:
              err instanceof Error ? err.message : 'Failed to create patient',
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
    const patient = await this.patientsRepo.findOne({
      where: { id: patientId, hospitalId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const safeFileUrl = await this.assertOwnedUploadFileUrl(
      input.fileUrl,
      hospitalId,
    );

    return this.documentsRepo.save(
      this.documentsRepo.create({
        patientId,
        name: input.name,
        fileUrl: safeFileUrl,
        fileType: input.fileType,
        documentType: input.documentType,
        uploadedById,
      }),
    );
  }

  /**
   * Only allow same-origin upload paths produced by POST /uploads/patient-documents.
   * Rejects third-party URLs and files already attached under another hospital.
   */
  private async assertOwnedUploadFileUrl(
    fileUrl: string,
    hospitalId: string,
  ): Promise<string> {
    const trimmed = fileUrl.trim();
    let pathname: string;
    try {
      if (trimmed.startsWith('/uploads/')) {
        pathname = trimmed.split('?')[0] ?? trimmed;
      } else {
        pathname = new URL(trimmed).pathname;
      }
    } catch {
      throw new BadRequestException(
        'Document fileUrl must be a valid /uploads/... path from this API',
      );
    }

    const match = pathname.match(/^\/uploads\/([^/]+)$/);
    if (!match) {
      throw new BadRequestException(
        'Document fileUrl must be an /uploads/<filename> path from this API',
      );
    }

    const filename = basename(match[1]);
    if (
      !filename ||
      filename !== match[1] ||
      filename.includes('..') ||
      /[%_]/.test(filename)
    ) {
      throw new BadRequestException('Invalid upload filename');
    }

    // UUID-style names from multer storage (uuid + optional extension)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(filename)) {
      throw new BadRequestException('Invalid upload filename');
    }

    const diskPath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(diskPath)) {
      throw new BadRequestException('Upload file not found on server');
    }

    const existingDocs = await this.documentsRepo.find({
      where: { fileUrl: ILike(`%/uploads/${filename}`) },
      take: 20,
    });

    for (const doc of existingDocs) {
      const owner = await this.patientsRepo.findOne({
        where: { id: doc.patientId },
      });
      if (owner && owner.hospitalId !== hospitalId) {
        throw new BadRequestException(
          'Upload file is already linked to another hospital',
        );
      }
    }

    // Store a stable relative path so clients always hit this API origin
    return `/uploads/${filename}`;
  }
}
