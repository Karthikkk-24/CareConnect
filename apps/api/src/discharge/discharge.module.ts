import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admission,
  Bed,
  Discharge,
  FollowUp,
  Patient,
} from '../database/entities';
import { DischargeResolver } from './discharge.resolver';
import { DischargeService } from './discharge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discharge, FollowUp, Admission, Patient, Bed]),
  ],
  providers: [DischargeResolver, DischargeService],
  exports: [DischargeService],
})
export class DischargeModule {}
