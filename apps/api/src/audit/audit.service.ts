import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditLogType, AuditLogsPageType } from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    actorId?: string;
    hospitalId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.auditRepo.save(
      this.auditRepo.create({
        actorId: params.actorId,
        hospitalId: params.hospitalId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata ?? {},
      }),
    );
  }

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

  /**
   * Hospital-scoped audit feed for compliance review (#237).
   * Metadata is intentionally omitted from the GraphQL projection — it can
   * contain PHI (e.g. patient names on delete).
   */
  async listHospitalLogs(
    hospitalId: string,
    opts: { resource?: string; limit?: number } = {},
  ): Promise<AuditLogsPageType> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.hospital_id = :hospitalId', { hospitalId })
      .orderBy('log.created_at', 'DESC')
      .take(limit);

    if (opts.resource) {
      qb.andWhere('log.resource = :resource', { resource: opts.resource });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      total,
      items: rows.map((row) => this.toAuditLogType(row)),
    };
  }

  private toAuditLogType(row: AuditLog): AuditLogType {
    return {
      id: row.id,
      actorId: row.actorId,
      actorEmail: row.actor?.email,
      actorName: row.actor?.fullName,
      hospitalId: row.hospitalId,
      action: row.action,
      resource: row.resource,
      resourceId: row.resourceId,
      createdAt: row.createdAt,
    };
  }
}
