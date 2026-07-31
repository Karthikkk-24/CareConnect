import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admission, Bed, Patient, Ward } from '../database/entities';
import { CommonModule } from '../common/common.module';
import { DischargeModule } from '../discharge/discharge.module';
import { AdmissionsResolver } from './admissions.resolver';
import { AdmissionsService } from './admissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admission, Patient, Ward, Bed]),
    DischargeModule,
    CommonModule,
  ],
  providers: [AdmissionsResolver, AdmissionsService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
