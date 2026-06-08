import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { UserRole } from './user-role.entity';
import { StaffProfile } from './staff-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auth_id', type: 'uuid', unique: true })
  authId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'hospital_id', type: 'uuid', nullable: true })
  hospitalId?: string;

  @ManyToOne(() => Hospital, (hospital) => hospital.users, { nullable: true })
  @JoinColumn({ name: 'hospital_id' })
  hospital?: Hospital;

  @Column({ name: 'onboarding_completed', default: false })
  onboardingCompleted: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.user, { eager: true })
  userRoles: UserRole[];

  @OneToMany(() => StaffProfile, (staff) => staff.user)
  staffProfiles: StaffProfile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
