import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, User, UserRole } from '../database/entities';
import { AuthService } from './auth.service';
import { ClerkJwtStrategy } from './clerk-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'clerk-jwt' }),
    TypeOrmModule.forFeature([User, UserRole, Role]),
  ],
  providers: [AuthService, ClerkJwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
