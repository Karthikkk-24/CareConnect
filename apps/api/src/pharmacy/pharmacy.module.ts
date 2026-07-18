import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyStock, Prescription } from '../database/entities';
import { PharmacyResolver } from './pharmacy.resolver';
import { PharmacyService } from './pharmacy.service';

@Module({
  imports: [TypeOrmModule.forFeature([PharmacyStock, Prescription])],
  providers: [PharmacyResolver, PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
