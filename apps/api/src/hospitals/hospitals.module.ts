import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hospital } from '../database/entities';
import { HospitalsResolver } from './hospitals.resolver';
import { HospitalsService } from './hospitals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hospital])],
  providers: [HospitalsResolver, HospitalsService],
  exports: [HospitalsService],
})
export class HospitalsModule {}
