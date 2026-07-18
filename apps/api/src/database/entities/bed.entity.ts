import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Ward } from './ward.entity';

export const BED_STATUSES = ['available', 'occupied', 'maintenance'] as const;

@Entity('beds')
export class Bed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'ward_id', type: 'uuid' })
  wardId: string;

  @ManyToOne(() => Ward, (ward) => ward.beds)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;

  @Column({ length: 50 })
  label: string;

  @Column({
    type: 'enum',
    enum: BED_STATUSES,
    enumName: 'bed_status',
    default: 'available',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
