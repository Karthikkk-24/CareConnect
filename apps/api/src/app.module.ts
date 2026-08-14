import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import depthLimit from 'graphql-depth-limit';
import { join } from 'path';
import type { Request, Response } from 'express';
import { graphqlQueryComplexityPlugin } from './common/graphql-query-complexity.plugin';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { AppThrottlerGuard } from './common/app-throttler.guard';
import {
  Hospital,
  Patient,
  PatientAllergy,
  PatientConsent,
  PatientDocument,
  PatientEmergencyContact,
  PatientImportJob,
  PatientInsurance,
  PatientMedicalHistory,
  PatientMedication,
  Permission,
  Role,
  StaffInvite,
  StaffProfile,
  User,
  UserRole,
  AuditLog,
  Department,
  Ward,
  Bed,
  Appointment,
  Admission,
  VitalSign,
  Diagnosis,
  ClinicalNote,
  Prescription,
  PrescriptionItem,
  LabOrder,
  LabResult,
  Discharge,
  FollowUp,
  Invoice,
  InvoiceItem,
  Payment,
  InventoryItem,
  PharmacyStock,
} from './database/entities';
import { PatientsModule } from './patients/patients.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { RbacModule } from './rbac/rbac.module';
import { StaffModule } from './staff/staff.module';
import { UsersModule } from './users/users.module';
import { ClerkModule } from './clerk/clerk.module';
import { AuditModule } from './audit/audit.module';
import { FacilityModule } from './facility/facility.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { ClinicalModule } from './clinical/clinical.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BillingModule } from './billing/billing.module';
import { InventoryModule } from './inventory/inventory.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { ReportsModule } from './reports/reports.module';
import { DischargeModule } from './discharge/discharge.module';
import { PortalModule } from './portal/portal.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
      ],
      validate: validateEnv,
    }),
    // ~120 GraphQL/HTTP ops per minute per IP (#207).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV');
        return {
          type: 'postgres',
          url: config.get<string>('DATABASE_URL'),
          entities: [
            Hospital,
            Role,
            Permission,
            User,
            UserRole,
            StaffProfile,
            StaffInvite,
            AuditLog,
            Patient,
            PatientEmergencyContact,
            PatientInsurance,
            PatientAllergy,
            PatientMedication,
            PatientMedicalHistory,
            PatientDocument,
            PatientConsent,
            PatientImportJob,
            Department,
            Ward,
            Bed,
            Appointment,
            Admission,
            VitalSign,
            Diagnosis,
            ClinicalNote,
            Prescription,
            PrescriptionItem,
            LabOrder,
            LabResult,
            Discharge,
            FollowUp,
            Invoice,
            InvoiceItem,
            Payment,
            InventoryItem,
            PharmacyStock,
          ],
          synchronize: false,
          logging: config.get('NODE_ENV') === 'development',
          // DATABASE_SSL=true relaxes pg TLS verification (rejectUnauthorized: false)
          // for providers like Neon. Never relax verification in production.
          ssl:
            config.get('DATABASE_SSL') === 'true'
              ? nodeEnv === 'production'
                ? true // pg default: full certificate verification against system CAs
                : { rejectUnauthorized: false }
              : false,
        };
      },
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        return {
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          // Playground + introspection only outside production.
          playground: !isProduction,
          introspection: !isProduction,
          // Depth 10 (#207). Max complexity 1000 via graphql-query-complexity (#238).
          validationRules: [depthLimit(10)],
          plugins: [graphqlQueryComplexityPlugin],
          context: ({ req, res }: { req: Request; res: Response }) => ({
            req,
            res,
          }),
        };
      },
    }),
    AuthModule,
    RbacModule,
    ClerkModule,
    AuditModule,
    UsersModule,
    HospitalsModule,
    StaffModule,
    PatientsModule,
    FacilityModule,
    AppointmentsModule,
    AdmissionsModule,
    ClinicalModule,
    DashboardModule,
    BillingModule,
    InventoryModule,
    PharmacyModule,
    ReportsModule,
    DischargeModule,
    PortalModule,
    UploadsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
