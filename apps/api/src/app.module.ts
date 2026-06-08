import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import type { Request } from 'express';
import { AuthModule } from './auth/auth.module';
import {
  Hospital,
  Permission,
  Role,
  StaffProfile,
  User,
  UserRole,
} from './database/entities';
import { HospitalsModule } from './hospitals/hospitals.module';
import { RbacModule } from './rbac/rbac.module';
import { StaffModule } from './staff/staff.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Hospital, Role, Permission, User, UserRole, StaffProfile],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    AuthModule,
    RbacModule,
    UsersModule,
    HospitalsModule,
    StaffModule,
  ],
})
export class AppModule {}
