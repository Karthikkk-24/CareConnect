import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
import { existsSync } from 'fs';
import { Patient, PatientDocument } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PERMISSIONS } from '@careconnect/types';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly documentsRepo: Repository<PatientDocument>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
  ) {}

  assertCanUpload(user: AuthenticatedUser) {
    if (user.roles.includes('super_admin')) return;
    if (!user.hospitalId) {
      throw new ForbiddenException('Hospital context required to upload');
    }
    if (!user.permissions.includes(PERMISSIONS.PATIENTS_WRITE)) {
      throw new ForbiddenException('patients:write permission required');
    }
  }

  async assertCanDownload(
    user: AuthenticatedUser,
    filename: string,
  ): Promise<{ filePath: string; mime?: string }> {
    const safe = basename(filename);
    if (safe !== filename || safe.includes('..')) {
      throw new ForbiddenException('Invalid filename');
    }

    const filePath = join(UPLOAD_DIR, safe);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    if (user.roles.includes('super_admin')) {
      const doc = await this.findDocumentByFilename(safe);
      return { filePath, mime: doc?.fileType };
    }

    const document = await this.findDocumentByFilename(safe);
    if (!document) {
      throw new ForbiddenException('No document record for this file');
    }

    const patient = await this.patientsRepo.findOne({
      where: { id: document.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found for document');
    }

    if (user.roles.includes('patient')) {
      if (patient.userId !== user.id) {
        throw new ForbiddenException('Access denied to this document');
      }
      return { filePath, mime: document.fileType };
    }

    if (
      !user.hospitalId ||
      user.hospitalId !== patient.hospitalId ||
      (!user.permissions.includes(PERMISSIONS.PATIENTS_READ) &&
        !user.permissions.includes(PERMISSIONS.PATIENTS_WRITE))
    ) {
      throw new ForbiddenException('Access denied to this document');
    }

    return { filePath, mime: document.fileType };
  }

  private async findDocumentByFilename(
    filename: string,
  ): Promise<PatientDocument | null> {
    return this.documentsRepo.findOne({
      where: { fileUrl: Like(`%/uploads/${filename}`) },
    });
  }

  async unlinkStoredFile(fileUrl: string | undefined): Promise<void> {
    if (!fileUrl) return;
    try {
      const idx = fileUrl.lastIndexOf('/uploads/');
      if (idx < 0) return;
      const filename = basename(fileUrl.slice(idx + '/uploads/'.length));
      const path = join(UPLOAD_DIR, filename);
      if (existsSync(path)) {
        await unlink(path);
      }
    } catch {
      // Best-effort cleanup; document row is already removed
    }
  }
}
