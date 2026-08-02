import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { basename, extname, join } from 'path';
import { DataSource, Repository } from 'typeorm';
import { PERMISSIONS } from '@careconnect/types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Patient, PatientDocument } from '../database/entities';

@Injectable()
export class UploadsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UploadsService.name);

  /** Time an uploaded file may sit unlinked before the sweep removes it. */
  static readonly ORPHAN_TTL_HOURS = 24;

  /** Arbitrary Postgres advisory lock id for the orphan sweep. */
  private static readonly ORPHAN_SWEEP_LOCK_KEY = 727003;

  constructor(
    @InjectRepository(PatientDocument)
    private readonly documentsRepo: Repository<PatientDocument>,
    @InjectRepository(Patient)
    private readonly patientsRepo: Repository<Patient>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Delete uploads/ files that are older than the TTL and have never been
   * linked to a patient_documents row (abandoned PHI uploads). Runs on
   * application bootstrap; a Postgres advisory lock prevents concurrent
   * sweeps when multiple instances boot together.
   *
   * Uses a dedicated QueryRunner so lock + unlock share one pooled connection
   * (session advisory locks are connection-scoped).
   */
  async removeOrphanUploads(now: Date = new Date()): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    let locked = false;
    try {
      const [lockRow] = (await runner.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [UploadsService.ORPHAN_SWEEP_LOCK_KEY],
      )) as { locked: boolean | string | number }[];
      const raw = lockRow?.locked;
      // node-pg usually returns boolean; accept common postgres truthies too
      locked = raw === true || raw === 't' || raw === 1;
      if (!locked) {
        this.logger.log(
          'Orphan upload sweep skipped — another instance holds the lock',
        );
        return;
      }

      const dir = join(process.cwd(), 'uploads');
      const cutoffMs =
        now.getTime() - UploadsService.ORPHAN_TTL_HOURS * 60 * 60 * 1000;
      let entries: string[];
      try {
        entries = await fs.readdir(dir);
      } catch {
        return; // uploads dir missing — nothing to do
      }

      let removed = 0;
      for (const entry of entries) {
        if (!this.isStoredUploadName(entry)) continue;
        const path = join(dir, entry);
        let stat;
        try {
          stat = await fs.stat(path);
        } catch {
          continue;
        }
        if (!stat.isFile() || stat.mtimeMs > cutoffMs) continue;

        const linked = await this.findDocumentByFilename(entry);
        if (linked) continue; // referenced by a document row — keep
        try {
          await fs.unlink(path);
          removed++;
        } catch (err) {
          this.logger.warn(
            `Failed to remove orphan upload ${entry}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
      if (removed > 0) {
        this.logger.log(`Orphan upload sweep removed ${removed} file(s)`);
      }
    } finally {
      if (locked) {
        await runner
          .query('SELECT pg_advisory_unlock($1)', [
            UploadsService.ORPHAN_SWEEP_LOCK_KEY,
          ])
          .catch(() => undefined);
      }
      await runner.release().catch(() => undefined);
    }
  }

  /** Match multer-generated names: UUID + safe extension (no dots/dirs). */
  private isStoredUploadName(name: string): boolean {
    if (name.includes('..') || name !== basename(name)) return false;
    const stem = name.slice(0, name.length - extname(name).length);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        stem,
      )
    ) {
      return false;
    }
    const ext = extname(name);
    return ext === '' || /^\.[A-Za-z0-9]{1,15}$/.test(ext);
  }

  /** Run the orphan sweep after the app is listening (never blocks boot). */
  onApplicationBootstrap(): void {
    setImmediate(() => {
      this.removeOrphanUploads().catch((err: unknown) => {
        this.logger.warn(
          `Orphan upload sweep failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    });
  }

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
    const matches = await this.documentsRepo
      .createQueryBuilder('doc')
      .where('doc.file_url = :relative', { relative: suffix })
      .orWhere('doc.file_url = :filename', { filename: safe })
      .orWhere('RIGHT(doc.file_url, :len) = :suffix', {
        len: suffix.length,
        suffix,
      })
      .getMany();

    if (matches.length > 1) {
      return null;
    }
    return matches[0] ?? null;
  }
}
