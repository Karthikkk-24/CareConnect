import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  User,
  Admission,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { UploadsService } from '../uploads/uploads.service';
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
    private readonly uploadsService: UploadsService,
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
      medications:
        patient.medications?.map(
          (m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`,
        ) ?? [],
      medicationDetails:
        patient.medications?.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          prescriber: m.prescriber,
        })) ?? [],
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

    const saved = await this.patientsRepo.save(patient);
    await this.replaceRelatedRecords(saved.id, input);

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
    await this.patientsRepo.softRemove(patient);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete',
      resource: 'patient',
      resourceId: patient.id,
      metadata: { fullName: patient.fullName },
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

    if (status === 'admitted') {
      const active = await this.admissionsRepo.findOne({
        where: { patientId: id, hospitalId, status: 'active' },
      });
      if (!active) {
        throw new BadRequestException(
          'Cannot set status to admitted without an active admission. Use Admit Patient first.',
        );
      }
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
    await this.uploadsService.unlinkStoredFile(fileUrl);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete_document',
      resource: 'patient_document',
      resourceId: document.id,
      metadata: { patientId },
    });

    return true;
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

    if (!targetUserId && lookupEmail) {
      const portalUser = await this.usersRepo.findOne({
        where: { email: lookupEmail },
        relations: ['userRoles', 'userRoles.role'],
      });
      if (!portalUser) {
        throw new NotFoundException(
          `No CareConnect user found for email ${lookupEmail}. Ask the patient to register first.`,
        );
      }
      targetUserId = portalUser.id;
    }

    if (!targetUserId) {
      throw new BadRequestException(
        'Provide a portal user email or userId to link (cannot default to staff account)',
      );
    }

    if (targetUserId === actor.id && !actor.roles.includes('patient')) {
      throw new BadRequestException(
        'Cannot link the current staff account as the patient portal user',
      );
    }

    const targetUser = await this.usersRepo.findOne({
      where: { id: targetUserId },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!targetUser) {
      throw new NotFoundException('Portal user not found');
    }

    const roleSlugs = (targetUser.userRoles ?? []).map((ur) => ur.role?.slug);
    const isPatientRole = roleSlugs.includes('patient');
    const isStaffRole = roleSlugs.some(
      (slug) => slug && slug !== 'patient' && slug !== 'super_admin',
    );
    if (isStaffRole && !isPatientRole) {
      throw new BadRequestException(
        'Target user is a staff account. Link a patient portal user instead.',
      );
    }

    const alreadyLinked = await this.patientsRepo.findOne({
      where: { userId: targetUserId },
    });
    if (alreadyLinked && alreadyLinked.id !== patient.id) {
      if (alreadyLinked.hospitalId !== hospitalId) {
        throw new ConflictException(
          'This user is already linked to a patient at another hospital',
        );
      }
      throw new ConflictException(
        'This user is already linked to another patient at this hospital',
      );
    }

    if (
      targetUser.hospitalId &&
      targetUser.hospitalId !== hospitalId &&
      !actor.roles.includes('super_admin')
    ) {
      throw new ForbiddenException(
        'Portal user belongs to a different hospital',
      );
    }

    patient.userId = targetUserId;
    if (!targetUser.hospitalId) {
      await this.usersRepo.update(targetUserId, { hospitalId });
    }
    const saved = await this.patientsRepo.save(patient);

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'link_account',
      resource: 'patient',
      resourceId: saved.id,
      metadata: { userId: targetUserId },
    });

    return this.toPatientType(saved);
  }

  private async saveRelatedRecords(
    patientId: string,
    input: PatientRelatedInput,
  ) {
    if (input.emergencyContacts?.length) {
      await this.emergencyRepo.save(
        input.emergencyContacts.map((c) =>
          this.emergencyRepo.create({ patientId, ...c }),
        ),
      );
    }

    if (
      input.insurance &&
      (input.insurance.provider || input.insurance.policyNumber)
    ) {
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
        input.allergies.map((a) =>
          this.allergiesRepo.create({ patientId, ...a }),
        ),
      );
    }

    if (input.medications?.length) {
      await this.medicationsRepo.save(
        input.medications.map((m) =>
          this.medicationsRepo.create({ patientId, ...m }),
        ),
      );
    }

    if (input.medicalHistory?.length) {
      await this.historyRepo.save(
        input.medicalHistory.map((h) =>
          this.historyRepo.create({ patientId, ...h }),
        ),
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

  private async replaceRelatedRecords(
    patientId: string,
    input: UpdatePatientInput,
  ) {
    if (input.emergencyContacts !== undefined) {
      await this.emergencyRepo.delete({ patientId });
      if (input.emergencyContacts.length) {
        await this.emergencyRepo.save(
          input.emergencyContacts.map((c) =>
            this.emergencyRepo.create({ patientId, ...c }),
          ),
        );
      }
    }

    if (input.insurance !== undefined) {
      await this.insuranceRepo.delete({ patientId });
      if (
        input.insurance.provider ||
        input.insurance.policyNumber ||
        input.insurance.groupNumber
      ) {
        await this.insuranceRepo.save(
          this.insuranceRepo.create({
            patientId,
            provider: input.insurance.provider,
            policyNumber: input.insurance.policyNumber,
            groupNumber: input.insurance.groupNumber,
          }),
        );
      }
    }

    if (input.allergies !== undefined) {
      await this.allergiesRepo.delete({ patientId });
      if (input.allergies.length) {
        await this.allergiesRepo.save(
          input.allergies.map((a) =>
            this.allergiesRepo.create({ patientId, ...a }),
          ),
        );
      }
    }

    if (input.medications !== undefined) {
      await this.medicationsRepo.delete({ patientId });
      if (input.medications.length) {
        await this.medicationsRepo.save(
          input.medications.map((m) =>
            this.medicationsRepo.create({ patientId, ...m }),
          ),
        );
      }
    }

    if (input.medicalHistory !== undefined) {
      await this.historyRepo.delete({ patientId });
      if (input.medicalHistory.length) {
        await this.historyRepo.save(
          input.medicalHistory.map((h) =>
            this.historyRepo.create({ patientId, ...h }),
          ),
        );
      }
    }

    if (input.consents !== undefined) {
      await this.consentsRepo.delete({ patientId });
      if (input.consents.length) {
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
  }

  async bulkImport(
    hospitalId: string,
    rows: BulkPatientRowInput[],
    userId: string,
    dryRun = false,
  ) {
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

    await this.uploadsService.assertFileUrlAttachable(input.fileUrl, hospitalId);

    try {
      return await this.documentsRepo.save(
        this.documentsRepo.create({
          patientId,
          name: input.name,
          fileUrl: input.fileUrl,
          fileType: input.fileType,
          documentType: input.documentType,
          uploadedById,
        }),
      );
    } catch (err) {
      await this.uploadsService.cleanupOrphanUpload(input.fileUrl);
      throw err;
    }
  }
}
