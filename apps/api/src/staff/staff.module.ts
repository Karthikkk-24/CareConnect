import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Role,
  StaffInvite,
  StaffProfile,
  User,
  UserRole,
} from '../database/entities';
import { StaffResolver } from './staff.resolver';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffProfile, User, Role, UserRole, StaffInvite]),
  ],
  providers: [StaffResolver, StaffService],
  exports: [StaffService],
})
export class StaffModule {}
