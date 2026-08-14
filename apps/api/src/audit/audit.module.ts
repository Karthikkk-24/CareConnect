import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditResolver } from './audit.resolver';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, AuditResolver],
  exports: [AuditService],
})
export class AuditModule {}
