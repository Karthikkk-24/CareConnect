import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admission,
  ClinicalNote,
  Diagnosis,
  LabOrder,
  LabResult,
  Patient,
  Prescription,
  PrescriptionItem,
  VitalSign,
} from '../database/entities';
import { ClinicalResolver } from './clinical.resolver';
import { ClinicalService } from './clinical.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VitalSign,
      Diagnosis,
      ClinicalNote,
      Prescription,
      PrescriptionItem,
      LabOrder,
      LabResult,
      Patient,
      Admission,
    ]),
  ],
  providers: [ClinicalResolver, ClinicalService],
  exports: [ClinicalService],
})
export class ClinicalModule {}
