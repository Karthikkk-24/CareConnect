import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import {
  Role,
  StaffInvite,
  StaffProfile,
  User,
  UserRole,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ClerkAdminService } from '../clerk/clerk-admin.service';
import { AuditService } from '../audit/audit.service';
import { CreateStaffInput, UpdateStaffInput } from './staff.types';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { code?: string }).code === '23505'
  );
}

const ASSIGNABLE_STAFF_ROLES = new Set([
  'hospital_manager',
  'doctor',
  'nurse',
  'receptionist',
  'lab_technician',
  'pharmacist',
  'accountant',
]);

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

  private assertAssignableRole(roleSlug: string, actor: AuthenticatedUser) {
    if (actor.roles.includes('super_admin')) return;
    if (!ASSIGNABLE_STAFF_ROLES.has(roleSlug)) {
      throw new BadRequestException(
        `Role "${roleSlug}" cannot be assigned via staff invite`,
      );
    }
  }

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
      take: 200,
    });
  }

  async findById(id: string): Promise<StaffProfile | null> {
    return this.staffRepo.findOne({
      where: { id },
      relations: ['user', 'user.userRoles', 'user.userRoles.role'],
    });
  }

  async findByIdForUser(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<StaffProfile | null> {
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
    this.assertAssignableRole(input.roleSlug, actor);

    const role = await this.rolesRepo.findOne({
      where: { slug: input.roleSlug },
    });
    if (!role) throw new NotFoundException(`Role ${input.roleSlug} not found`);

    let authId: string;
    if (this.clerkAdmin.isConfigured()) {
      const invited = await this.clerkAdmin.inviteStaffByEmail(
        input.email,
        input.fullName,
      );
      // Clerk assigns the real `user_...` id on invite acceptance. Until then,
      // stash a deterministic placeholder so the users table row stays unique;
      // syncAndGetUser upgrades authId to the real Clerk id on first login.
      authId = invited.clerkUserId ?? `pending_${randomUUID()}`;
    } else {
      authId = `pending_${randomUUID()}`;
    }

    const email = input.email.trim();
    const token = randomBytes(32).toString('hex');

    let staffId: string;
    try {
      staffId = await this.staffRepo.manager.transaction(async (manager) => {
        const usersRepo = manager.getRepository(User);
        const userRolesRepo = manager.getRepository(UserRole);
        const staffRepo = manager.getRepository(StaffProfile);
        const invitesRepo = manager.getRepository(StaffInvite);

        const existingByEmail = await usersRepo
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.userRoles', 'userRoles')
          .leftJoinAndSelect('userRoles.role', 'role')
          .where('LOWER(user.email) = LOWER(:email)', { email })
          .getOne();

        let user: User;
        if (existingByEmail) {
          user = existingByEmail;
          if (user.hospitalId && user.hospitalId !== hospitalId) {
            throw new BadRequestException(
              'This user already belongs to another hospital. CareConnect users can only be staff at one hospital.',
            );
          }
          const hasPatientRole = (user.userRoles ?? []).some(
            (ur) => ur.role?.slug === 'patient',
          );
          if (hasPatientRole) {
            throw new BadRequestException(
              'This email belongs to a patient portal account and cannot be invited as staff. Use a different email.',
            );
          }
          if (!user.hospitalId) {
            // Preserve a live Clerk identity; only set authId when missing or still pending.
            const nextAuthId =
              !user.authId || user.authId.startsWith('pending_')
                ? authId
                : user.authId;
            await usersRepo.update(user.id, {
              hospitalId,
              fullName: input.fullName,
              authId: nextAuthId,
            });
            user.hospitalId = hospitalId;
            user.authId = nextAuthId;
          }
        } else {
          user = await usersRepo.save(
            usersRepo.create({
              authId,
              email,
              fullName: input.fullName,
              hospitalId,
              onboardingCompleted: true,
            }),
          );
        }

        const existingProfile = await staffRepo.findOne({
          where: { userId: user.id, hospitalId },
        });
        if (existingProfile) {
          throw new ConflictException(
            'A staff profile already exists for this user at this hospital',
          );
        }

        const existingRole = await userRolesRepo.findOne({
          where: { userId: user.id, roleId: role.id, hospitalId },
        });
        if (!existingRole) {
          await userRolesRepo.save(
            userRolesRepo.create({
              userId: user.id,
              roleId: role.id,
              hospitalId,
            }),
          );
        }

        // Expire any prior pending invite for this email so the unique index allows a new one.
        await invitesRepo
          .createQueryBuilder()
          .update(StaffInvite)
          .set({ expiresAt: new Date() })
          .where('hospital_id = :hospitalId', { hospitalId })
          .andWhere('LOWER(email) = LOWER(:email)', { email })
          .andWhere('accepted_at IS NULL')
          .execute();

        const staff = await staffRepo.save(
          staffRepo.create({
            userId: user.id,
            hospitalId,
            phone: input.phone,
            department: input.department,
            specialization: input.specialization,
            employeeId: input.employeeId,
          }),
        );

        await invitesRepo.save(
          invitesRepo.create({
            hospitalId,
            email,
            fullName: input.fullName,
            roleSlug: input.roleSlug,
            token,
            staffProfileId: staff.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
        );

        return staff.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Staff profile or pending invite already exists for this email',
        );
      }
      throw error;
    }

    await this.audit.log({
      actorId: actor.id,
      hospitalId,
      action: 'create',
      resource: 'staff',
      resourceId: staffId,
      metadata: { email, roleSlug: input.roleSlug },
    });

    const staff = (await this.findById(staffId))!;
    (staff as StaffProfile & { inviteToken?: string }).inviteToken = token;
    return staff;
  }

  async update(
    id: string,
    input: UpdateStaffInput,
    actor: AuthenticatedUser,
  ): Promise<StaffProfile> {
    const staff = await this.findByIdForUser(id, actor);
    if (!staff) throw new NotFoundException('Staff member not found');

    const targetIsHospitalAdmin = (staff.user?.userRoles ?? []).some(
      (ur) => ur.role?.slug === 'hospital_admin',
    );
    const actorIsAdmin =
      actor.roles.includes('hospital_admin') ||
      actor.roles.includes('super_admin');
    const touchingPrivileges =
      input.roleSlug !== undefined || input.isActive !== undefined;
    if (targetIsHospitalAdmin && touchingPrivileges && !actorIsAdmin) {
      throw new ForbiddenException(
        'Only a hospital admin can change or deactivate another hospital admin',
      );
    }

    if (input.fullName) {
      await this.usersRepo.update(staff.userId, { fullName: input.fullName });
    }

    if (input.roleSlug) {
      this.assertAssignableRole(input.roleSlug, actor);
      const role = await this.rolesRepo.findOne({
        where: { slug: input.roleSlug },
      });
      if (!role)
        throw new NotFoundException(`Role ${input.roleSlug} not found`);

      await this.userRolesRepo.delete({
        userId: staff.userId,
        hospitalId: staff.hospitalId,
      });
      await this.userRolesRepo.save(
        this.userRolesRepo.create({
          userId: staff.userId,
          roleId: role.id,
          hospitalId: staff.hospitalId,
        }),
      );
    }

    const previousActive = staff.isActive;
    const nextActive = input.isActive ?? staff.isActive;

    // Sync IdP before persisting so a Clerk failure does not leave DB/IdP divergent (#200).
    if (previousActive !== nextActive) {
      await this.syncClerkActiveState(staff.userId, nextActive);
    }

    Object.assign(staff, {
      phone: input.phone ?? staff.phone,
      department: input.department ?? staff.department,
      specialization: input.specialization ?? staff.specialization,
      employeeId: input.employeeId ?? staff.employeeId,
      isActive: nextActive,
    });

    const saved = await this.staffRepo.save(staff);
    if (input.isActive === false) {
      await this.usersRepo.update(staff.userId, { isActive: false });
      await this.invalidateOutstandingInvites(saved);
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

    await this.syncClerkActiveState(staff.userId, false);

    staff.isActive = false;
    await this.staffRepo.save(staff);
    await this.usersRepo.update(staff.userId, { isActive: false });
    await this.invalidateOutstandingInvites(staff);

    await this.audit.log({
      actorId: actor.id,
      hospitalId: staff.hospitalId,
      action: 'deactivate',
      resource: 'staff',
      resourceId: staff.id,
    });

    return true;
  }

  /**
   * Rotate token and reset expiry for a pending (unaccepted) staff invite.
   * Managers can recover lost/expired invites without deleting the profile.
   */
  async resendStaffInvite(
    staffId: string,
    actor: AuthenticatedUser,
  ): Promise<StaffProfile & { inviteToken: string }> {
    const staff = await this.findByIdForUser(staffId, actor);
    if (!staff) throw new NotFoundException('Staff member not found');
    if (!staff.isActive) {
      throw new BadRequestException(
        'Cannot resend invite for a deactivated staff member',
      );
    }

    const invite = await this.invitesRepo.findOne({
      where: { staffProfileId: staff.id },
      order: { createdAt: 'DESC' },
    });
    if (!invite) {
      throw new NotFoundException('No invite found for this staff member');
    }
    if (invite.acceptedAt) {
      throw new BadRequestException(
        'Invite has already been accepted; cannot resend',
      );
    }

    const token = randomBytes(32).toString('hex');
    invite.token = token;
    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.invitesRepo.save(invite);

    await this.audit.log({
      actorId: actor.id,
      hospitalId: staff.hospitalId,
      action: 'resend_invite',
      resource: 'staff',
      resourceId: staff.id,
      metadata: { email: invite.email },
    });

    return Object.assign(staff, { inviteToken: token });
  }

  /** Expire unaccepted invites so deactivated staff cannot self-reactivate. */
  private async invalidateOutstandingInvites(staff: StaffProfile) {
    const now = new Date();
    await this.invitesRepo
      .createQueryBuilder()
      .update(StaffInvite)
      .set({ expiresAt: now })
      .where('staff_profile_id = :staffId', { staffId: staff.id })
      .andWhere('accepted_at IS NULL')
      .execute();
    if (staff.user?.email) {
      await this.invitesRepo
        .createQueryBuilder()
        .update(StaffInvite)
        .set({ expiresAt: now })
        .where('LOWER(email) = LOWER(:email)', { email: staff.user.email })
        .andWhere('hospital_id = :hospitalId', {
          hospitalId: staff.hospitalId,
        })
        .andWhere('accepted_at IS NULL')
        .execute();
    }
  }

  private async syncClerkActiveState(userId: string, active: boolean) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user?.authId || user.authId.startsWith('pending_')) return;
    if (active) {
      await this.clerkAdmin.reactivateUser(user.authId);
    } else {
      await this.clerkAdmin.deactivateUser(user.authId);
    }
  }

  async acceptInvite(
    token: string,
    authId: string,
    email: string,
  ): Promise<StaffProfile> {
    const staffId = await this.invitesRepo.manager.transaction(
      async (manager) => {
        const invitesRepo = manager.getRepository(StaffInvite);
        const usersRepo = manager.getRepository(User);
        const staffRepo = manager.getRepository(StaffProfile);

        const invite = await invitesRepo
          .createQueryBuilder('invite')
          .setLock('pessimistic_write')
          .where('invite.token = :token', { token })
          .getOne();
        if (!invite) throw new NotFoundException('Invite not found');
        if (invite.acceptedAt)
          throw new UnauthorizedException('Invite already accepted');
        if (invite.expiresAt < new Date())
          throw new UnauthorizedException('Invite expired');
        if (invite.email.toLowerCase() !== email.toLowerCase()) {
          throw new ForbiddenException(
            'Invite email does not match signed-in user',
          );
        }

        const staff = invite.staffProfileId
          ? await staffRepo.findOne({
              where: { id: invite.staffProfileId },
              relations: ['user', 'user.userRoles', 'user.userRoles.role'],
            })
          : null;
        if (!staff)
          throw new NotFoundException('Staff profile missing for invite');
        if (!staff.isActive) {
          throw new ForbiddenException(
            'This staff account has been deactivated; contact a hospital administrator',
          );
        }

        const invitee = await usersRepo.findOne({
          where: { id: staff.userId },
        });
        if (invitee && invitee.isActive === false) {
          throw new ForbiddenException(
            'This account has been deactivated; contact a hospital administrator',
          );
        }
        if (invitee?.hospitalId && invitee.hospitalId !== invite.hospitalId) {
          throw new BadRequestException(
            'This user already belongs to another hospital. CareConnect users can only be staff at one hospital.',
          );
        }

        await usersRepo.update(staff.userId, {
          authId,
          onboardingCompleted: true,
          hospitalId: invite.hospitalId,
          isActive: true,
        });

        invite.acceptedAt = new Date();
        await invitesRepo.save(invite);
        return staff.id;
      },
    );

    return (await this.findById(staffId))!;
  }

  toStaffType(staff: StaffProfile & { inviteToken?: string }) {
    const roleSlug = staff.user?.userRoles?.[0]?.role?.slug ?? 'staff';
    const inviteToken = staff.inviteToken;
    const webOrigin =
      process.env.CORS_ORIGIN?.replace(/\/$/, '') || 'http://localhost:3000';
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
