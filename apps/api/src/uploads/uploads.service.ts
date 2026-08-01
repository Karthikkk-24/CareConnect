import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { basename } from 'path';
import { Repository } from 'typeorm';
import { PERMISSIONS } from '@careconnect/types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Patient, PatientDocument } from '../database/entities';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly documentsRepo: Repository<PatientDocument>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
  ) {}

  /**
   * Authorize download of a stored file by resolving it to a patient_documents
   * row and checking hospital membership / patient ownership.
   */
  async assertCanDownload(
    filename: string,
    user: AuthenticatedUser,
  ): Promise<PatientDocument> {
    const document = await this.findDocumentByFilename(filename);
    if (!document) {
      throw new NotFoundException('File not found');
    }

    const patient = await this.patientsRepo.findOne({
      where: { id: document.patientId },
    });
    if (!patient) {
      throw new NotFoundException('File not found');
    }

    if (user.roles.includes('super_admin')) {
      return document;
    }

    // Hospital staff (including dual-role patient+staff): same hospital + patients read/write
    const isHospitalStaff =
      !!user.hospitalId &&
      user.hospitalId === patient.hospitalId &&
      (user.permissions.includes(PERMISSIONS.PATIENTS_READ) ||
        user.permissions.includes(PERMISSIONS.PATIENTS_WRITE));
    if (isHospitalStaff) {
      return document;
    }

    // Pure patient portal user: only their linked chart's documents
    if (user.roles.includes('patient')) {
      if (patient.userId && patient.userId === user.id) {
        return document;
      }
      throw new ForbiddenException('Access denied');
    }

    throw new ForbiddenException('Access denied');
  }

  /** Staff with patients:write may upload PHI documents. */
  assertCanUpload(user: AuthenticatedUser): void {
    if (user.roles.includes('super_admin')) return;
    if (user.permissions.includes(PERMISSIONS.PATIENTS_WRITE)) return;
    throw new ForbiddenException(
      'patients:write permission required to upload documents',
    );
  }

  private async findDocumentByFilename(
    filename: string,
  ): Promise<PatientDocument | null> {
    const safe = basename(filename);
    if (
      !safe ||
      safe !== filename ||
      safe.includes('..') ||
      /[%_]/.test(safe)
    ) {
      return null;
    }

    const suffix = `/uploads/${safe}`;
    // Exact suffix match via RIGHT — avoids LIKE metacharacters in user input
    return this.documentsRepo
      .createQueryBuilder('doc')
      .where('doc.file_url = :relative', { relative: suffix })
      .orWhere('doc.file_url = :filename', { filename: safe })
      .orWhere('RIGHT(doc.file_url, :len) = :suffix', {
        len: suffix.length,
        suffix,
      })
      .getOne();
  }
}
