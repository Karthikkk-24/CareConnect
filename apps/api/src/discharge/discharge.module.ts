import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admission,
  Bed,
  Discharge,
  FollowUp,
  Patient,
} from '../database/entities';
import { CommonModule } from '../common/common.module';
import { DischargeResolver } from './discharge.resolver';
import { DischargeService } from './discharge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discharge, FollowUp, Admission, Patient, Bed]),
    CommonModule,
  ],
  providers: [DischargeResolver, DischargeService],
  exports: [DischargeService],
})
export class DischargeModule {}
