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
import { Discharge } from './discharge.entity';

export const FOLLOW_UP_STATUSES = [
  'scheduled',
  'completed',
  'missed',
  'rescheduled',
] as const;

@Entity('follow_ups')
export class FollowUp {
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

  @Column({ name: 'discharge_id', type: 'uuid', nullable: true })
  dischargeId?: string;

  @ManyToOne(() => Discharge, (discharge) => discharge.followUps, {
    nullable: true,
  })
  @JoinColumn({ name: 'discharge_id' })
  discharge?: Discharge;

  @Column({ name: 'doctor_id', type: 'uuid', nullable: true })
  doctorId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: User;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type?: string;

  @Column({
    type: 'enum',
    enum: FOLLOW_UP_STATUSES,
    enumName: 'follow_up_status',
    default: 'scheduled',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
