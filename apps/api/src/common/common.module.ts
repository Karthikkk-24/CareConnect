import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hospital, StaffProfile } from '../database/entities';
import { HospitalContextService } from './hospital-context.service';
import { HospitalDoctorValidator } from './hospital-doctor.validator';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([StaffProfile, Hospital])],
  providers: [HospitalDoctorValidator, HospitalContextService],
  exports: [HospitalDoctorValidator, HospitalContextService],
})
export class CommonModule {}
