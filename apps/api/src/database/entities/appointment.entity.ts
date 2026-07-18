import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Patient } from './patient.entity';
import { User } from './user.entity';
import { Department } from './department.entity';

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
] as const;

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'doctor_id', type: 'uuid', nullable: true })
  doctorId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: User;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: APPOINTMENT_STATUSES,
    enumName: 'appointment_status',
    default: 'scheduled',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
