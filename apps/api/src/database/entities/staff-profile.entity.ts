import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Hospital } from './hospital.entity';

@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.staffProfiles, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital, (hospital) => hospital.staff)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ length: 100, nullable: true })
  department?: string;

  @Column({ length: 100, nullable: true })
  specialization?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'employee_id', length: 50, nullable: true })
  employeeId?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
