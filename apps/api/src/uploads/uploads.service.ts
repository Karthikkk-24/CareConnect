import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { unlink, writeFile, readFile } from 'fs/promises';
import { basename, join } from 'path';
import { existsSync } from 'fs';
import { Patient, PatientDocument } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PERMISSIONS } from '@careconnect/types';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

type UploadMeta = { hospitalId: string; uploadedById: string; createdAt: string };

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

  metaPath(filename: string): string {
    return join(UPLOAD_DIR, `${basename(filename)}.meta.json`);
  }

  async recordUploadMeta(
    filename: string,
    hospitalId: string,
    uploadedById: string,
  ): Promise<void> {
    const meta: UploadMeta = {
      hospitalId,
      uploadedById,
      createdAt: new Date().toISOString(),
    };
    await writeFile(this.metaPath(filename), JSON.stringify(meta), 'utf8');
  }

  async readUploadMeta(filename: string): Promise<UploadMeta | null> {
    try {
      const raw = await readFile(this.metaPath(filename), 'utf8');
      return JSON.parse(raw) as UploadMeta;
    } catch {
      return null;
    }
  }

  /**
   * fileUrl must be http(s) …/uploads/<uuid>.ext, file on disk, and owned by hospital
   * (via upload meta or an existing same-hospital document link).
   */
  async assertFileUrlAttachable(fileUrl: string, hospitalId: string): Promise<void> {
    let parsed: URL;
    try {
      parsed = new URL(fileUrl);
    } catch {
      throw new BadRequestException('Invalid document file URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Document file URL must be http(s)');
    }
    const match = parsed.pathname.match(
      /\/uploads\/([a-f0-9-]{36}\.[a-z0-9]+)$/i,
    );
    if (!match) {
      throw new BadRequestException(
        'Document file URL must point to an authenticated /uploads/<uuid>.ext file',
      );
    }
    const filename = match[1];
    const filePath = join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) {
      throw new BadRequestException('Uploaded file not found on server');
    }

    const meta = await this.readUploadMeta(filename);
    if (meta) {
      if (meta.hospitalId !== hospitalId) {
        throw new ForbiddenException(
          'Cannot attach a document file belonging to another hospital',
        );
      }
      return;
    }

    const existingDocs = await this.documentsRepo.find({
      where: { fileUrl: Like(`%/uploads/${filename}`) },
      relations: ['patient'],
    });
    const foreign = existingDocs.find((d) => d.patient?.hospitalId !== hospitalId);
    if (foreign) {
      throw new ForbiddenException(
        'Cannot attach a document file belonging to another hospital',
      );
    }
    const sameHospital = existingDocs.find(
      (d) => d.patient?.hospitalId === hospitalId,
    );
    if (!sameHospital) {
      throw new BadRequestException(
        'Upload is not registered for this hospital; re-upload the file',
      );
    }
  }

  async cleanupOrphanUpload(fileUrl: string | undefined): Promise<void> {
    if (!fileUrl) return;
    try {
      const idx = fileUrl.lastIndexOf('/uploads/');
      if (idx < 0) return;
      const filename = basename(fileUrl.slice(idx + '/uploads/'.length));
      const linked = await this.findDocumentByFilename(filename);
      if (linked) return;
      await this.unlinkStoredFile(fileUrl);
      const meta = this.metaPath(filename);
      if (existsSync(meta)) await unlink(meta);
    } catch {
      // best-effort
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
