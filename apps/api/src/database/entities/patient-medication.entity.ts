import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patient } from './patient.entity';

@Entity('patient_medications')
export class PatientMedication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.medications)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  dosage?: string;

  @Column({ length: 100, nullable: true })
  frequency?: string;

  @Column({ length: 255, nullable: true })
  prescriber?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
