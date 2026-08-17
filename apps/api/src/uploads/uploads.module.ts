import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  Hospital,
  LabOrder,
  LabResult,
  Patient,
  PatientDocument,
} from '../database/entities';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    TypeOrmModule.forFeature([
      PatientDocument,
      Patient,
      LabResult,
      LabOrder,
      Hospital,
    ]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
