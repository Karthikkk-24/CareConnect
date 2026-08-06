import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital, User } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateHospitalInput, UpdateHospitalInput } from './hospitals.types';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalsRepo: Repository<Hospital>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Create a hospital. For bootstrap callers (no hospitalId yet), immediately
   * bind the creator so only they can claim first-admin via completeOnboarding.
   */
  async create(
    input: CreateHospitalInput,
    actor?: AuthenticatedUser,
  ): Promise<Hospital> {
    const baseSlug = this.slugify(input.name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.hospitalsRepo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    return this.hospitalsRepo.manager.transaction(async (manager) => {
      const hospitalsRepo = manager.getRepository(Hospital);
      const usersRepo = manager.getRepository(User);

      const hospital = await hospitalsRepo.save(
        hospitalsRepo.create({ ...input, slug }),
      );

      if (actor && !actor.hospitalId && !actor.roles.includes('super_admin')) {
        const user = await usersRepo.findOne({ where: { id: actor.id } });
        if (user && !user.hospitalId) {
          await usersRepo.update(user.id, { hospitalId: hospital.id });
        }
      }

      return hospital;
    });
  }

  async findById(id: string): Promise<Hospital | null> {
    return this.hospitalsRepo.findOne({ where: { id } });
  }

  async findByIdForUser(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Hospital | null> {
    const hospital = await this.findById(id);
    if (!hospital) return null;
    if (user.roles.includes('super_admin')) return hospital;
    if (user.hospitalId !== id) throw new ForbiddenException('Access denied');
    return hospital;
  }

  async findAll(): Promise<Hospital[]> {
    return this.hospitalsRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findForUser(user: AuthenticatedUser): Promise<Hospital[]> {
    if (!user.hospitalId) return [];
    const hospital = await this.findById(user.hospitalId);
    return hospital ? [hospital] : [];
  }

  async update(
    id: string,
    input: UpdateHospitalInput,
    user: AuthenticatedUser,
  ): Promise<Hospital> {
    const hospital = await this.findByIdForUser(id, user);
    if (!hospital) throw new NotFoundException('Hospital not found');

    // Tenant lockout via isActive is super_admin-only (#188). Hospital admins
    // may update profile fields but must not deactivate/reactivate the tenant.
    if (
      input.isActive !== undefined &&
      input.isActive !== hospital.isActive &&
      !user.roles.includes('super_admin')
    ) {
      throw new ForbiddenException(
        'Only a platform super admin can activate or deactivate a hospital',
      );
    }

    Object.assign(hospital, {
      name: input.name ?? hospital.name,
      email: input.email ?? hospital.email,
      phone: input.phone ?? hospital.phone,
      address: input.address ?? hospital.address,
      city: input.city ?? hospital.city,
      country: input.country ?? hospital.country,
      logoUrl: input.logoUrl ?? hospital.logoUrl,
      isActive: input.isActive ?? hospital.isActive,
    });

    return this.hospitalsRepo.save(hospital);
  }
}
