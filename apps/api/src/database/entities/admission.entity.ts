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
import { Ward } from './ward.entity';
import { Bed } from './bed.entity';

export const ADMISSION_STATUSES = [
  'active',
  'discharged',
  'transferred',
] as const;

@Entity('admissions')
export class Admission {
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

  @Column({ name: 'attending_doctor_id', type: 'uuid', nullable: true })
  attendingDoctorId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'attending_doctor_id' })
  attendingDoctor?: User;

  @Column({ name: 'ward_id', type: 'uuid', nullable: true })
  wardId?: string;

  @ManyToOne(() => Ward, { nullable: true })
  @JoinColumn({ name: 'ward_id' })
  ward?: Ward;

  @Column({ name: 'bed_id', type: 'uuid', nullable: true })
  bedId?: string;

  @ManyToOne(() => Bed, { nullable: true })
  @JoinColumn({ name: 'bed_id' })
  bed?: Bed;

  @Column({ name: 'admitted_at', type: 'timestamptz' })
  admittedAt: Date;

  @Column({ name: 'discharged_at', type: 'timestamptz', nullable: true })
  dischargedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: ADMISSION_STATUSES,
    enumName: 'admission_status',
    default: 'active',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
