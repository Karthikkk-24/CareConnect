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
    ]),
  ],
  providers: [PatientsResolver, PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
