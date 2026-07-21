import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { PatientsResolver } from './patients.resolver';
import { PatientsService } from './patients.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      PatientEmergencyContact,
      PatientInsurance,
      PatientAllergy,
      PatientMedication,
      PatientMedicalHistory,
      PatientDocument,
      PatientConsent,
      PatientImportJob,
      User,
      Admission,
    ]),
    UploadsModule,
  ],
  providers: [PatientsResolver, PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
