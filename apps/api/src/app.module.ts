import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import type { Request } from 'express';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
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
        ssl: (() => {
          if (config.get('DATABASE_SSL') !== 'true') return false;
          const isProd = config.get('NODE_ENV') === 'production';
          // Neon provides trusted CAs; reject unauthorized in production.
          return { rejectUnauthorized: isProd };
        })(),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get('NODE_ENV') === 'production';
        return {
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          playground: !isProd,
          introspection: !isProd,
          context: ({ req }: { req: Request }) => ({ req }),
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
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
