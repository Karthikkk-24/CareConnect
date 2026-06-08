import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, User, UserRole } from '../database/entities';
import { AuthService } from './auth.service';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase-jwt' }),
    TypeOrmModule.forFeature([User, UserRole, Role]),
  ],
  providers: [AuthService, SupabaseJwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
