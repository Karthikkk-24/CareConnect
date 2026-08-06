import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { PatientsService } from './patients.service';
import {
  BulkImportResultType,
  BulkPatientRowInput,
  CreatePatientInput,
  PatientDetailType,
  PatientDocumentInput,
  PatientDocumentType,
  PatientsPageType,
  PatientType,
  UpdatePatientInput,
} from './patients.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class PatientsResolver {
  constructor(private readonly patientsService: PatientsService) {}

  @Query(() => PatientsPageType)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async patients(
    @CurrentUser() user: AuthenticatedUser,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('search', { nullable: true }) search?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientsPageType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.findAll(
      resolvedHospitalId,
      page,
      limit,
      search,
    );
  }

  @Query(() => PatientDetailType)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async patient(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientDetailType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.findById(id, resolvedHospitalId);
  }

  @Mutation(() => PatientType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreatePatientInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.create(resolvedHospitalId, input, user);
  }

  @Mutation(() => PatientType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async updatePatient(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('input') input: UpdatePatientInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.updatePatient(
      id,
      input,
      resolvedHospitalId,
      user,
    );
  }

  @Mutation(() => Boolean)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async deletePatient(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<boolean> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.deletePatient(id, resolvedHospitalId, user);
  }

  @Mutation(() => PatientType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async updatePatientStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('status') status: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.updatePatientStatus(
      id,
      status,
      resolvedHospitalId,
      user,
    );
  }

  @Mutation(() => BulkImportResultType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async importPatients(
    @CurrentUser() user: AuthenticatedUser,
    @Args('rows', { type: () => [BulkPatientRowInput] })
    rows: BulkPatientRowInput[],
    @Args('dryRun', { defaultValue: true }) dryRun: boolean,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<BulkImportResultType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.bulkImport(
      resolvedHospitalId,
      rows,
      user.id,
      dryRun,
    );
  }

  @Mutation(() => PatientDocumentType)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async addPatientDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('input') input: PatientDocumentInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientDocumentType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    const doc = await this.patientsService.addDocument(
      patientId,
      resolvedHospitalId,
      input,
      user.id,
    );
    return {
      id: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      documentType: doc.documentType,
      createdAt: doc.createdAt,
    };
  }

  @Mutation(() => Boolean)
  @Roles(
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.HOSPITAL_ADMIN,
    ROLES.HOSPITAL_MANAGER,
    ROLES.SUPER_ADMIN,
  )
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async deletePatientDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<boolean> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.deletePatientDocument(
      id,
      patientId,
      resolvedHospitalId,
      user,
    );
  }

  @Mutation(() => PatientType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async linkPatientAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('userId', { nullable: true }) userId?: string,
    @Args('email', { nullable: true }) email?: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.linkPatientAccount(
      patientId,
      resolvedHospitalId,
      user,
      userId,
      email,
    );
  }

  @Mutation(() => PatientType)
  @Roles(ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_MANAGER, ROLES.SUPER_ADMIN)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async unlinkPatientAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PatientType> {
    const resolvedHospitalId = this.patientsService.resolveHospitalId(
      user,
      hospitalId,
    );
    return this.patientsService.unlinkPatientAccount(
      patientId,
      resolvedHospitalId,
      user,
    );
  }
}
