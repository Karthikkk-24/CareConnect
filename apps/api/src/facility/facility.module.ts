import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bed, Department, Ward } from '../database/entities';
import { FacilityResolver } from './facility.resolver';
import { FacilityService } from './facility.service';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Ward, Bed])],
  providers: [FacilityResolver, FacilityService],
  exports: [FacilityService],
})
export class FacilityModule {}
