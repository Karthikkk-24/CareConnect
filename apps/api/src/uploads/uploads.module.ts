import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  LabOrder,
  LabResult,
  Patient,
  PatientDocument,
} from '../database/entities';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([PatientDocument, Patient, LabResult, LabOrder]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
