import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, ROLES } from '@careconnect/types';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../rbac/permissions.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { ClinicalService } from './clinical.service';
import { HospitalContextService } from '../common/hospital-context.service';
import {
  ClinicalNoteType,
  CompleteLabResultInput,
  CancelPrescriptionInput,
  CreateClinicalNoteInput,
  CreateDiagnosisInput,
  CreateLabOrderInput,
  CreatePrescriptionInput,
  CreateVitalInput,
  DiagnosisType,
  LabOrderType,
  LabResultType,
  PrescriptionType,
  UpdateLabOrderStatusInput,
  VitalSignType,
} from './clinical.types';
import { UseGuards } from '@nestjs/common';

const CLINICIAN_ROLES = [
  ROLES.DOCTOR,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
] as const;

/** Doctors and nurses may author SOAP notes and lab orders. */
const CLINICAL_AUTHOR_ROLES = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
] as const;

/** Chart reads: clinical staff, not pharmacist or lab_technician. */
const CHART_READ_ROLES = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
  ROLES.SUPER_ADMIN,
] as const;

/** Lab worklist: lab techs plus clinical staff. Pharmacist is excluded. */
const LAB_ORDER_READ_ROLES = [
  ROLES.LAB_TECHNICIAN,
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.HOSPITAL_ADMIN,
  ROLES.HOSPITAL_MANAGER,
  ROLES.SUPER_ADMIN,
] as const;

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class ClinicalResolver {
  constructor(
    private readonly clinicalService: ClinicalService,
    private readonly hospitalContext: HospitalContextService,
  ) {}

  @Query(() => [LabOrderType])
  @Roles(...LAB_ORDER_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async labOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<LabOrderType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.clinicalService.listLabOrders(resolvedHospitalId, status);
  }

  @Query(() => [VitalSignType])
  @Roles(...CHART_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async vitalSigns(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<VitalSignType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.clinicalService.listVitalSigns(resolvedHospitalId, patientId);
  }

  @Query(() => [ClinicalNoteType])
  @Roles(...CHART_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async clinicalNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<ClinicalNoteType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.clinicalService.listClinicalNotes(
      resolvedHospitalId,
      patientId,
    );
  }

  @Query(() => [DiagnosisType])
  @Roles(...CHART_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async diagnoses(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DiagnosisType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.clinicalService.listDiagnoses(resolvedHospitalId, patientId);
  }

  @Query(() => [PrescriptionType])
  @Roles(...CHART_READ_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_READ)
  async prescriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Args('patientId') patientId: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PrescriptionType[]> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: false },
    );
    return this.clinicalService.listPrescriptions(
      resolvedHospitalId,
      patientId,
    );
  }

  @Mutation(() => VitalSignType, { name: 'createVitalSign' })
  @Roles(...CLINICAL_AUTHOR_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createVital(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateVitalInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<VitalSignType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.createVital(resolvedHospitalId, input, user);
  }

  @Mutation(() => DiagnosisType)
  @Roles(...CLINICIAN_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createDiagnosis(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateDiagnosisInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<DiagnosisType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.createDiagnosis(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => ClinicalNoteType)
  @Roles(...CLINICAL_AUTHOR_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createClinicalNote(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateClinicalNoteInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<ClinicalNoteType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.createClinicalNote(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => PrescriptionType)
  @Roles(...CLINICIAN_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreatePrescriptionInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PrescriptionType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.createPrescription(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => LabOrderType)
  @Roles(...CLINICAL_AUTHOR_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async createLabOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CreateLabOrderInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<LabOrderType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.createLabOrder(resolvedHospitalId, input, user);
  }

  @Mutation(() => LabResultType)
  @Permissions(PERMISSIONS.LAB_WRITE)
  async completeLabResult(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CompleteLabResultInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<LabResultType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.completeLabResult(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => LabOrderType)
  @Permissions(PERMISSIONS.LAB_WRITE)
  async updateLabOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateLabOrderStatusInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<LabOrderType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.updateLabOrderStatus(
      resolvedHospitalId,
      input,
      user,
    );
  }

  @Mutation(() => PrescriptionType)
  @Roles(...CLINICIAN_ROLES)
  @Permissions(PERMISSIONS.PATIENTS_WRITE)
  async cancelPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CancelPrescriptionInput,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
  ): Promise<PrescriptionType> {
    const resolvedHospitalId = await this.hospitalContext.resolveHospitalId(
      user,
      hospitalId,
      { write: true },
    );
    return this.clinicalService.cancelPrescription(
      resolvedHospitalId,
      input,
      user,
    );
  }
}
