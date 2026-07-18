import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Admission } from './admission.entity';
import { Patient } from './patient.entity';
import { User } from './user.entity';
import { FollowUp } from './follow-up.entity';

@Entity('discharges')
export class Discharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'admission_id', type: 'uuid' })
  admissionId: string;

  @ManyToOne(() => Admission)
  @JoinColumn({ name: 'admission_id' })
  admission: Admission;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'discharged_by', type: 'uuid', nullable: true })
  dischargedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'discharged_by' })
  dischargedBy?: User;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ name: 'medications_at_discharge', type: 'text', nullable: true })
  medicationsAtDischarge?: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @Column({ name: 'discharged_at', type: 'timestamptz' })
  dischargedAt: Date;

  @OneToMany(() => FollowUp, (followUp) => followUp.discharge)
  followUps: FollowUp[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
