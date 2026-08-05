import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admission,
  LabOrder,
  LabResult,
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
} from '../database/entities';
import { PatientsResolver } from './patients.resolver';
import { PatientsService } from './patients.service';

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
      LabOrder,
      LabResult,
    ]),
  ],
  providers: [PatientsResolver, PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
