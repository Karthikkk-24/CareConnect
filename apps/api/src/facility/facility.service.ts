import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bed, Department, Ward } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import {
  BedType,
  CreateBedInput,
  CreateDepartmentInput,
  CreateWardInput,
  DepartmentType,
  WardType,
} from './facility.types';

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentsRepo: Repository<Department>,
    @InjectRepository(Ward) private readonly wardsRepo: Repository<Ward>,
    @InjectRepository(Bed) private readonly bedsRepo: Repository<Bed>,
    private readonly audit: AuditService,
  ) {}

  assertHospitalAccess(user: AuthenticatedUser, hospitalId: string) {
    if (user.roles.includes('super_admin')) return;
    if (!user.hospitalId || user.hospitalId !== hospitalId) {
      throw new ForbiddenException('Access denied for this hospital');
    }
  }

  resolveHospitalId(user: AuthenticatedUser, hospitalId?: string): string {
    if (user.roles.includes('super_admin') && hospitalId) return hospitalId;
    const id = hospitalId ?? user.hospitalId;
    if (!id) throw new NotFoundException('Hospital context required');
    this.assertHospitalAccess(user, id);
    return id;
  }

  toDepartmentType(department: Department): DepartmentType {
    return {
      id: department.id,
      hospitalId: department.hospitalId,
      name: department.name,
      description: department.description,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }

  toWardType(ward: Ward): WardType {
    return {
      id: ward.id,
      hospitalId: ward.hospitalId,
      departmentId: ward.departmentId,
      name: ward.name,
      floor: ward.floor,
      createdAt: ward.createdAt,
    };
  }

  toBedType(bed: Bed): BedType {
    return {
      id: bed.id,
      hospitalId: bed.hospitalId,
      wardId: bed.wardId,
      label: bed.label,
      status: bed.status,
      createdAt: bed.createdAt,
    };
  }

  async createDepartment(
    hospitalId: string,
    input: CreateDepartmentInput,
    actor: AuthenticatedUser,
  ): Promise<DepartmentType> {
    const department = await this.departmentsRepo.save(
      this.departmentsRepo.create({
        hospitalId,
        name: input.name,
        description: input.description,
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'department',
      resourceId: department.id,
      metadata: { name: department.name },
    });

    return this.toDepartmentType(department);
  }

  async createWard(
    hospitalId: string,
    input: CreateWardInput,
    actor: AuthenticatedUser,
  ): Promise<WardType> {
    if (input.departmentId) {
      const department = await this.departmentsRepo.findOne({
        where: { id: input.departmentId, hospitalId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const ward = await this.wardsRepo.save(
      this.wardsRepo.create({
        hospitalId,
        departmentId: input.departmentId,
        name: input.name,
        floor: input.floor,
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'ward',
      resourceId: ward.id,
      metadata: { name: ward.name },
    });

    return this.toWardType(ward);
  }

  async createBed(
    hospitalId: string,
    input: CreateBedInput,
    actor: AuthenticatedUser,
  ): Promise<BedType> {
    const ward = await this.wardsRepo.findOne({
      where: { id: input.wardId, hospitalId },
    });
    if (!ward) throw new NotFoundException('Ward not found');

    const bed = await this.bedsRepo.save(
      this.bedsRepo.create({
        hospitalId,
        wardId: input.wardId,
        label: input.label,
        status: 'available',
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'bed',
      resourceId: bed.id,
      metadata: { label: bed.label, wardId: bed.wardId },
    });

    return this.toBedType(bed);
  }

  async listDepartments(hospitalId: string): Promise<DepartmentType[]> {
    const departments = await this.departmentsRepo.find({
      where: { hospitalId },
      order: { name: 'ASC' },
    });
    return departments.map((d) => this.toDepartmentType(d));
  }

  async listWards(
    hospitalId: string,
    departmentId?: string,
  ): Promise<WardType[]> {
    const wards = await this.wardsRepo.find({
      where: departmentId ? { hospitalId, departmentId } : { hospitalId },
      order: { name: 'ASC' },
    });
    return wards.map((w) => this.toWardType(w));
  }

  async listBeds(hospitalId: string, wardId?: string): Promise<BedType[]> {
    const beds = await this.bedsRepo.find({
      where: wardId ? { hospitalId, wardId } : { hospitalId },
      order: { label: 'ASC' },
    });
    return beds.map((b) => this.toBedType(b));
  }

  async deleteDepartment(
    hospitalId: string,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<boolean> {
    const department = await this.departmentsRepo.findOne({
      where: { id, hospitalId },
    });
    if (!department) throw new NotFoundException('Department not found');
    const wardCount = await this.wardsRepo.count({
      where: { departmentId: id, hospitalId },
    });
    if (wardCount > 0) {
      throw new ForbiddenException('Remove wards in this department first');
    }
    await this.departmentsRepo.remove(department);
    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete',
      resource: 'department',
      resourceId: id,
    });
    return true;
  }

  async deleteWard(
    hospitalId: string,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<boolean> {
    const ward = await this.wardsRepo.findOne({ where: { id, hospitalId } });
    if (!ward) throw new NotFoundException('Ward not found');
    const bedCount = await this.bedsRepo.count({
      where: { wardId: id, hospitalId },
    });
    if (bedCount > 0) {
      throw new ForbiddenException('Remove beds in this ward first');
    }
    await this.wardsRepo.remove(ward);
    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete',
      resource: 'ward',
      resourceId: id,
    });
    return true;
  }

  async deleteBed(
    hospitalId: string,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<boolean> {
    const bed = await this.bedsRepo.findOne({ where: { id, hospitalId } });
    if (!bed) throw new NotFoundException('Bed not found');
    if (bed.status === 'occupied') {
      throw new ForbiddenException('Cannot delete an occupied bed');
    }
    await this.bedsRepo.remove(bed);
    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'delete',
      resource: 'bed',
      resourceId: id,
    });
    return true;
  }
}
