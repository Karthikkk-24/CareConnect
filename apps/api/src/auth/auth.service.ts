import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, User, UserRole } from '../database/entities';
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
  ) {}

  async syncAndGetUser(authId: string, email?: string): Promise<AuthenticatedUser | null> {
    let user = await this.usersRepo.findOne({
      where: { authId },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    // Link invited staff who were created with a different auth_id placeholder
    if (!user && email) {
      user = await this.usersRepo.findOne({
        where: { email },
        relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
      });
      if (user) {
        await this.usersRepo.update(user.id, { authId });
        user.authId = authId;
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
        relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
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
        user.userRoles?.flatMap((ur) => ur.role.permissions?.map((p) => p.slug) ?? []) ?? [],
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
   */
  async completeOnboarding(
    userId: string,
    fullName: string,
    hospitalId?: string,
    assignHospitalAdmin = false,
  ) {
    await this.usersRepo.update(userId, {
      fullName,
      hospitalId,
      onboardingCompleted: true,
    });

    if (hospitalId && assignHospitalAdmin) {
      const existingRoles = await this.userRolesRepo.find({ where: { userId } });
      if (existingRoles.length === 0) {
        const adminRole = await this.rolesRepo.findOne({
          where: { slug: 'hospital_admin' },
        });

        if (adminRole) {
          await this.userRolesRepo.save(
            this.userRolesRepo.create({
              userId,
              roleId: adminRole.id,
              hospitalId,
            }),
          );
        }
      }
    }
  }
}
