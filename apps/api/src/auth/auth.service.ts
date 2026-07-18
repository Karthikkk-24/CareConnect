import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital, Role, User, UserRole } from '../database/entities';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRolesRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(Hospital)
    private readonly hospitalsRepo: Repository<Hospital>,
  ) {}

  async syncAndGetUser(
    authId: string,
    email?: string,
  ): Promise<AuthenticatedUser | null> {
    let user = await this.usersRepo.findOne({
      where: { authId },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    // Link invited staff who were created with a different auth_id placeholder
    if (!user && email) {
      user = await this.usersRepo.findOne({
        where: { email },
        relations: [
          'userRoles',
          'userRoles.role',
          'userRoles.role.permissions',
        ],
      });
      if (user) {
        // Only reclaim pending invite placeholders — never steal an active Clerk-linked account
        const isPending = user.authId.startsWith('pending_');
        if (isPending || user.authId === authId) {
          await this.usersRepo.update(user.id, { authId });
          user.authId = authId;
        } else {
          user = null;
        }
      }
    }

    if (!user && email) {
      user = this.usersRepo.create({
        authId,
        email,
        fullName: email.split('@')[0],
      });
      user = await this.usersRepo.save(user);
      user = await this.usersRepo.findOne({
        where: { id: user.id },
        relations: [
          'userRoles',
          'userRoles.role',
          'userRoles.role.permissions',
        ],
      });
    }

    if (!user) return null;

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.toAuthenticatedUser(user);
  }

  toAuthenticatedUser(user: User): AuthenticatedUser {
    const roles = user.userRoles?.map((ur) => ur.role.slug) ?? [];
    const permissions = [
      ...new Set(
        user.userRoles?.flatMap(
          (ur) => ur.role.permissions?.map((p) => p.slug) ?? [],
        ) ?? [],
      ),
    ];

    return {
      id: user.id,
      authId: user.authId,
      email: user.email,
      fullName: user.fullName,
      hospitalId: user.hospitalId,
      roles: roles as AuthenticatedUser['roles'],
      permissions,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  /**
   * Hospital registration path only: assign hospital_admin when user has no roles yet
   * and is completing first-time hospital setup.
   *
   * Tenancy rules:
   * - Cannot switch to a different hospital once hospitalId is set (unless super_admin).
   * - Joining an existing hospital requires assignHospitalAdmin bootstrap OR invite flow.
   * - Bootstrap admin only when that hospital has zero hospital_admin members yet.
   */
  async completeOnboarding(
    actor: AuthenticatedUser,
    fullName: string,
    hospitalId?: string,
    assignHospitalAdmin = false,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: actor.id } });
    if (!user) throw new NotFoundException('User not found');

    const isSuperAdmin = actor.roles.includes('super_admin');

    if (hospitalId) {
      const hospital = await this.hospitalsRepo.findOne({
        where: { id: hospitalId },
      });
      if (!hospital) throw new NotFoundException('Hospital not found');

      if (user.hospitalId && user.hospitalId !== hospitalId && !isSuperAdmin) {
        throw new ForbiddenException('Cannot switch hospital membership');
      }

      if (!user.hospitalId && !assignHospitalAdmin && !isSuperAdmin) {
        throw new ForbiddenException(
          'Hospital membership requires a staff invite or hospital registration',
        );
      }

      if (!user.hospitalId && assignHospitalAdmin && !isSuperAdmin) {
        const adminRole = await this.rolesRepo.findOne({
          where: { slug: 'hospital_admin' },
        });
        if (adminRole) {
          const existingAdmins = await this.userRolesRepo.count({
            where: { roleId: adminRole.id, hospitalId },
          });
          if (existingAdmins > 0) {
            throw new ForbiddenException(
              'Hospital already has an administrator; join via staff invite',
            );
          }
        }
      }
    }

    await this.usersRepo.update(user.id, {
      fullName,
      hospitalId: hospitalId ?? user.hospitalId,
      onboardingCompleted: true,
    });

    if (hospitalId && assignHospitalAdmin) {
      const existingRoles = await this.userRolesRepo.find({
        where: { userId: user.id },
      });
      if (existingRoles.length === 0) {
        const adminRole = await this.rolesRepo.findOne({
          where: { slug: 'hospital_admin' },
        });

        if (adminRole) {
          await this.userRolesRepo.save(
            this.userRolesRepo.create({
              userId: user.id,
              roleId: adminRole.id,
              hospitalId,
            }),
          );
        }
      }
    }
  }

  /** Patient portal path: assign patient role and mark onboarding complete. */
  async completePatientOnboarding(userId: string, fullName: string) {
    await this.usersRepo.update(userId, {
      fullName,
      onboardingCompleted: true,
    });

    const existingRoles = await this.userRolesRepo.find({ where: { userId } });
    if (existingRoles.length === 0) {
      const patientRole = await this.rolesRepo.findOne({
        where: { slug: 'patient' },
      });
      if (patientRole) {
        await this.userRolesRepo.save(
          this.userRolesRepo.create({
            userId,
            roleId: patientRole.id,
            hospitalId: undefined,
          }),
        );
      }
    }
  }

  async assignRole(userId: string, roleSlug: string, hospitalId?: string) {
    const role = await this.rolesRepo.findOne({ where: { slug: roleSlug } });
    if (!role) return;
    const existing = await this.userRolesRepo.findOne({
      where: { userId, roleId: role.id, hospitalId: hospitalId ?? undefined },
    });
    if (!existing) {
      await this.userRolesRepo.save(
        this.userRolesRepo.create({ userId, roleId: role.id, hospitalId }),
      );
    }
  }
}
