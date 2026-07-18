import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Role, StaffInvite, StaffProfile, User, UserRole } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ClerkAdminService } from '../clerk/clerk-admin.service';
import { AuditService } from '../audit/audit.service';
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
    @InjectRepository(StaffInvite)
    private readonly invitesRepo: Repository<StaffInvite>,
    private readonly clerkAdmin: ClerkAdminService,
    private readonly audit: AuditService,
  ) {}

  assertHospitalAccess(user: AuthenticatedUser, hospitalId: string) {
    if (user.roles.includes('super_admin')) return;
    if (!user.hospitalId || user.hospitalId !== hospitalId) {
      throw new ForbiddenException('Access denied for this hospital');
    }
  }

  async findByHospital(hospitalId: string): Promise<StaffProfile[]> {
    return this.staffRepo.find({
      where: { hospitalId },
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

  async findByIdForUser(id: string, actor: AuthenticatedUser): Promise<StaffProfile | null> {
    const staff = await this.findById(id);
    if (!staff) return null;
    this.assertHospitalAccess(actor, staff.hospitalId);
    return staff;
  }

  async create(
    hospitalId: string,
    input: CreateStaffInput,
    actor: AuthenticatedUser,
  ): Promise<StaffProfile> {
    this.assertHospitalAccess(actor, hospitalId);

    const role = await this.rolesRepo.findOne({ where: { slug: input.roleSlug } });
    if (!role) throw new NotFoundException(`Role ${input.roleSlug} not found`);

    let authId: string;
    if (this.clerkAdmin.isConfigured()) {
      const invited = await this.clerkAdmin.inviteStaffByEmail(input.email, input.fullName);
      // Clerk assigns the real `user_...` id on invite acceptance. Until then,
      // stash a deterministic placeholder so the users table row stays unique;
      // syncAndGetUser upgrades authId to the real Clerk id on first login.
      authId = invited.clerkUserId ?? `pending_${randomUUID()}`;
    } else {
      authId = `pending_${randomUUID()}`;
    }

    const existingByEmail = await this.usersRepo.findOne({ where: { email: input.email } });
    let user: User;
    if (existingByEmail) {
      user = existingByEmail;
      if (!user.hospitalId) {
        await this.usersRepo.update(user.id, { hospitalId, fullName: input.fullName, authId });
        user.hospitalId = hospitalId;
        user.authId = authId;
      }
    } else {
      user = await this.usersRepo.save(
        this.usersRepo.create({
          authId,
          email: input.email,
          fullName: input.fullName,
          hospitalId,
          onboardingCompleted: true,
        }),
      );
    }

    const existingRole = await this.userRolesRepo.findOne({
      where: { userId: user.id, roleId: role.id, hospitalId },
    });
    if (!existingRole) {
      await this.userRolesRepo.save(
        this.userRolesRepo.create({
          userId: user.id,
          roleId: role.id,
          hospitalId,
        }),
      );
    }

    const staff = await this.staffRepo.save(
      this.staffRepo.create({
        userId: user.id,
        hospitalId,
        phone: input.phone,
        department: input.department,
        specialization: input.specialization,
        employeeId: input.employeeId,
      }),
    );

    const token = randomBytes(32).toString('hex');
    await this.invitesRepo.save(
      this.invitesRepo.create({
        hospitalId,
        email: input.email,
        fullName: input.fullName,
        roleSlug: input.roleSlug,
        token,
        staffProfileId: staff.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'staff',
      resourceId: staff.id,
      metadata: { email: input.email, roleSlug: input.roleSlug },
    });

    // Attach invite token for GraphQL response (not persisted on entity)
    (staff as StaffProfile & { inviteToken?: string }).inviteToken = token;
    return staff;
  }

  async update(id: string, input: UpdateStaffInput, actor: AuthenticatedUser): Promise<StaffProfile> {
    const staff = await this.findByIdForUser(id, actor);
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
      employeeId: input.employeeId ?? staff.employeeId,
      isActive: input.isActive ?? staff.isActive,
    });

    const saved = await this.staffRepo.save(staff);
    if (input.isActive === false) {
      await this.usersRepo.update(staff.userId, { isActive: false });
    } else if (input.isActive === true) {
      await this.usersRepo.update(staff.userId, { isActive: true });
    }

    await this.audit.log({
      actorId: actor.id,
      hospitalId: staff.hospitalId,
      action: 'update',
      resource: 'staff',
      resourceId: staff.id,
    });

    return saved;
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<boolean> {
    const staff = await this.findByIdForUser(id, actor);
    if (!staff) throw new NotFoundException('Staff member not found');

    staff.isActive = false;
    await this.staffRepo.save(staff);
    await this.usersRepo.update(staff.userId, { isActive: false });

    await this.audit.log({
      actorId: actor.id,
      hospitalId: staff.hospitalId,
      action: 'deactivate',
      resource: 'staff',
      resourceId: staff.id,
    });

    return true;
  }

  async acceptInvite(token: string, authId: string, email: string): Promise<StaffProfile> {
    const invite = await this.invitesRepo.findOne({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt) throw new UnauthorizedException('Invite already accepted');
    if (invite.expiresAt < new Date()) throw new UnauthorizedException('Invite expired');
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('Invite email does not match signed-in user');
    }

    const staff = invite.staffProfileId
      ? await this.findById(invite.staffProfileId)
      : null;
    if (!staff) throw new NotFoundException('Staff profile missing for invite');

    await this.usersRepo.update(staff.userId, {
      authId,
      onboardingCompleted: true,
      hospitalId: invite.hospitalId,
      isActive: true,
    });

    invite.acceptedAt = new Date();
    await this.invitesRepo.save(invite);

    return (await this.findById(staff.id))!;
  }

  toStaffType(staff: StaffProfile & { inviteToken?: string }) {
    const roleSlug = staff.user?.userRoles?.[0]?.role?.slug ?? 'staff';
    const inviteToken = staff.inviteToken;
    const webOrigin = process.env.CORS_ORIGIN?.replace(/\/$/, '') || 'http://localhost:3000';
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
      employeeId: staff.employeeId,
      isActive: staff.isActive,
      inviteToken,
      inviteUrl: inviteToken ? `${webOrigin}/invite/${inviteToken}` : undefined,
      createdAt: staff.createdAt,
    };
  }

  resolveHospitalId(user: AuthenticatedUser, hospitalId?: string): string {
    if (user.roles.includes('super_admin') && hospitalId) return hospitalId;
    const id = hospitalId ?? user.hospitalId;
    if (!id) throw new NotFoundException('Hospital context required');
    this.assertHospitalAccess(user, id);
    return id;
  }
}
