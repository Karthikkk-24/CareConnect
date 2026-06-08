import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, StaffProfile, User, UserRole } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateStaffInput, UpdateStaffInput } from './staff.types';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRolesRepo: Repository<UserRole>,
  ) {}

  async findByHospital(hospitalId: string): Promise<StaffProfile[]> {
    return this.staffRepo.find({
      where: { hospitalId, isActive: true },
      relations: ['user', 'user.userRoles', 'user.userRoles.role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<StaffProfile | null> {
    return this.staffRepo.findOne({
      where: { id },
      relations: ['user', 'user.userRoles', 'user.userRoles.role'],
    });
  }

  async create(
    hospitalId: string,
    input: CreateStaffInput,
  ): Promise<StaffProfile> {
    const role = await this.rolesRepo.findOne({ where: { slug: input.roleSlug } });
    if (!role) throw new NotFoundException(`Role ${input.roleSlug} not found`);

    const placeholderAuthId = crypto.randomUUID();

    const user = await this.usersRepo.save(
      this.usersRepo.create({
        authId: placeholderAuthId,
        email: input.email,
        fullName: input.fullName,
        hospitalId,
      }),
    );

    await this.userRolesRepo.save(
      this.userRolesRepo.create({
        userId: user.id,
        roleId: role.id,
        hospitalId,
      }),
    );

    return this.staffRepo.save(
      this.staffRepo.create({
        userId: user.id,
        hospitalId,
        phone: input.phone,
        department: input.department,
        specialization: input.specialization,
      }),
    );
  }

  async update(id: string, input: UpdateStaffInput): Promise<StaffProfile> {
    const staff = await this.findById(id);
    if (!staff) throw new NotFoundException('Staff member not found');

    if (input.fullName) {
      await this.usersRepo.update(staff.userId, { fullName: input.fullName });
    }

    if (input.roleSlug) {
      const role = await this.rolesRepo.findOne({ where: { slug: input.roleSlug } });
      if (!role) throw new NotFoundException(`Role ${input.roleSlug} not found`);

      await this.userRolesRepo.delete({ userId: staff.userId, hospitalId: staff.hospitalId });
      await this.userRolesRepo.save(
        this.userRolesRepo.create({
          userId: staff.userId,
          roleId: role.id,
          hospitalId: staff.hospitalId,
        }),
      );
    }

    Object.assign(staff, {
      phone: input.phone ?? staff.phone,
      department: input.department ?? staff.department,
      specialization: input.specialization ?? staff.specialization,
      isActive: input.isActive ?? staff.isActive,
    });

    return this.staffRepo.save(staff);
  }

  async remove(id: string): Promise<boolean> {
    const staff = await this.findById(id);
    if (!staff) throw new NotFoundException('Staff member not found');

    staff.isActive = false;
    await this.staffRepo.save(staff);
    await this.usersRepo.update(staff.userId, { isActive: false });
    return true;
  }

  toStaffType(staff: StaffProfile) {
    const roleSlug = staff.user?.userRoles?.[0]?.role?.slug ?? 'staff';
    return {
      id: staff.id,
      userId: staff.userId,
      hospitalId: staff.hospitalId,
      fullName: staff.user.fullName,
      email: staff.user.email,
      phone: staff.phone,
      roleSlug,
      department: staff.department,
      specialization: staff.specialization,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
    };
  }

  resolveHospitalId(user: AuthenticatedUser, hospitalId?: string): string {
    return hospitalId ?? user.hospitalId ?? '';
  }
}
