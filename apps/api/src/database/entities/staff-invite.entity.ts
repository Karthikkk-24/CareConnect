import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { StaffProfile } from './staff-profile.entity';

@Entity('staff_invites')
export class StaffInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'role_slug', length: 50 })
  roleSlug: string;

  @Column({ length: 64, unique: true })
  token: string;

  @Column({ name: 'staff_profile_id', type: 'uuid', nullable: true })
  staffProfileId?: string;

  @ManyToOne(() => StaffProfile, { nullable: true })
  @JoinColumn({ name: 'staff_profile_id' })
  staffProfile?: StaffProfile;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
