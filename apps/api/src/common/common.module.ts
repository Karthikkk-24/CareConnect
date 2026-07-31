import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffProfile } from '../database/entities';
import { HospitalDoctorValidator } from './hospital-doctor.validator';

@Module({
  imports: [TypeOrmModule.forFeature([StaffProfile])],
  providers: [HospitalDoctorValidator],
  exports: [HospitalDoctorValidator],
})
export class CommonModule {}
