import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersResolver } from './users.resolver';

@Module({
  imports: [AuthModule],
  providers: [UsersResolver],
})
export class UsersModule {}
