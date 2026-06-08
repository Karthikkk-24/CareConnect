import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from '../database/entities';
import { CreateHospitalInput } from './hospitals.types';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalsRepo: Repository<Hospital>,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(input: CreateHospitalInput): Promise<Hospital> {
    const baseSlug = this.slugify(input.name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.hospitalsRepo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const hospital = this.hospitalsRepo.create({ ...input, slug });
    return this.hospitalsRepo.save(hospital);
  }

  async findById(id: string): Promise<Hospital | null> {
    return this.hospitalsRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<Hospital[]> {
    return this.hospitalsRepo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }
}
