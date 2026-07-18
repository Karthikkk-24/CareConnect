import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';

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
}
