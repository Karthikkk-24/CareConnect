import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Hospital, Role, User, UserRole } from '../database/entities';
import type { AuthenticatedUser } from './auth.types';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { code?: string }).code === '23505'
  );
}

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
      user = await this.usersRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userRoles', 'userRoles')
        .leftJoinAndSelect('userRoles.role', 'role')
        .leftJoinAndSelect('role.permissions', 'permissions')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .getOne();
      if (user) {
        // Only reclaim pending invite placeholders — never steal an active Clerk-linked account
        const isPending = user.authId.startsWith('pending_');
        if (isPending || user.authId === authId) {
          await this.usersRepo.update(user.id, { authId });
          user.authId = authId;
        } else {
          // Fail closed: do not create a duplicate users row for the same email
          throw new UnauthorizedException(
            'An account with this email already exists. Sign in with the original identity or contact support.',
          );
        }
      }
    }

    if (!user && email) {
      try {
        user = this.usersRepo.create({
          authId,
          email,
          fullName: email.split('@')[0],
        });
        user = await this.usersRepo.save(user);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new UnauthorizedException(
            'An account with this email already exists. Sign in with the original identity or contact support.',
          );
        }
        throw error;
      }
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

  async toAuthenticatedUser(user: User): Promise<AuthenticatedUser> {
    const activeHospitalId = user.hospitalId;
    const PLATFORM_ROLE_SLUGS = new Set(['super_admin', 'patient']);

    // Missing hospital row must fail closed (same as isActive=false).
    // Previously `!hospital || hospital.isActive` treated orphans as active (#189).
    let hospitalActive = true;
    if (activeHospitalId) {
      const hospital = await this.hospitalsRepo.findOne({
        where: { id: activeHospitalId },
      });
      hospitalActive = !!hospital?.isActive;
    }

    const scopedRoles =
      user.userRoles?.filter((ur) => {
        const slug = ur.role?.slug;
        if (slug && PLATFORM_ROLE_SLUGS.has(slug)) return true;
        // Global grants (no hospital on the assignment)
        if (!ur.hospitalId) return true;
        // Hospital-scoped grants only apply for the user's active hospital
        return !!activeHospitalId && ur.hospitalId === activeHospitalId;
      }) ?? [];

    let roles = scopedRoles.map((ur) => ur.role.slug);
    let permissions = [
      ...new Set(
        scopedRoles.flatMap(
          (ur) => ur.role.permissions?.map((p) => p.slug) ?? [],
        ),
      ),
    ];

    // Deactivated hospital: strip hospital-scoped staff roles/permissions so
    // tenant APIs fail closed. Keep platform patient/super_admin identities.
    if (!hospitalActive && !roles.includes('super_admin')) {
      roles = roles.filter((slug) => PLATFORM_ROLE_SLUGS.has(slug));
      permissions = [];
    }

    return {
      id: user.id,
      authId: user.authId,
      email: user.email,
      fullName: user.fullName,
      hospitalId: user.hospitalId,
      hospitalActive,
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
    }

    // Bootstrap hospital_admin under a transaction + advisory lock so two
    // concurrent registrants cannot both observe zero admins and both win.
    if (hospitalId && assignHospitalAdmin) {
      // Patients (and any already-roled users) must join via invite, not bootstrap
      if (!isSuperAdmin && actor.roles.length > 0) {
        throw new ForbiddenException(
          'Hospital bootstrap is only available during first-time registration',
        );
      }
      // Caller must already be bound to this hospital via bootstrap createHospital
      // (prevents a second registrant from claiming an orphan hospital).
      if (!isSuperAdmin) {
        const fresh = await this.usersRepo.findOne({ where: { id: user.id } });
        if (!fresh?.hospitalId || fresh.hospitalId !== hospitalId) {
          throw new ForbiddenException(
            'Only the user who created this hospital can become its first administrator',
          );
        }
      }
      try {
        await this.usersRepo.manager.transaction(async (manager) => {
          await manager.query(
            `SELECT pg_advisory_xact_lock(hashtext($1::text))`,
            [`hospital-admin-bootstrap:${hospitalId}`],
          );

          const adminRole = await manager.findOne(Role, {
            where: { slug: 'hospital_admin' },
          });
          if (!adminRole) {
            await manager.update(User, user.id, {
              fullName,
              hospitalId,
              onboardingCompleted: true,
            });
            return;
          }

          if (!isSuperAdmin) {
            const existingAdmins = await manager.count(UserRole, {
              where: { roleId: adminRole.id, hospitalId },
            });
            if (existingAdmins > 0) {
              throw new ForbiddenException(
                'Hospital already has an administrator; join via staff invite',
              );
            }
          }

          await manager.update(User, user.id, {
            fullName,
            hospitalId,
            onboardingCompleted: true,
          });

          const existingRoles = await manager.find(UserRole, {
            where: { userId: user.id },
          });
          if (existingRoles.length === 0) {
            await manager.save(
              manager.create(UserRole, {
                userId: user.id,
                roleId: adminRole.id,
                hospitalId,
              }),
            );
          }
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ForbiddenException(
            'Hospital already has an administrator; join via staff invite',
          );
        }
        throw error;
      }
      return;
    }

    await this.usersRepo.update(user.id, {
      fullName,
      hospitalId: hospitalId ?? user.hospitalId,
      onboardingCompleted: true,
    });
  }

  /** Patient portal path: assign patient role and mark onboarding complete. */
  async completePatientOnboarding(user: AuthenticatedUser, fullName: string) {
    const staffRoles = (user.roles ?? []).filter((role) => role !== 'patient');
    if (user.hospitalId || staffRoles.length > 0) {
      throw new ForbiddenException(
        'Only patient accounts without a hospital assignment can complete patient onboarding',
      );
    }

    await this.usersRepo.update(user.id, {
      fullName,
      onboardingCompleted: true,
    });

    const existingRoles = await this.userRolesRepo.find({
      where: { userId: user.id },
    });
    if (existingRoles.length === 0) {
      const patientRole = await this.rolesRepo.findOne({
        where: { slug: 'patient' },
      });
      if (patientRole) {
        try {
          await this.userRolesRepo.save(
            this.userRolesRepo.create({
              userId: user.id,
              roleId: patientRole.id,
              hospitalId: undefined,
            }),
          );
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
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
