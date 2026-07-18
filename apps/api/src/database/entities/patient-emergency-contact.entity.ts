import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patient } from './patient.entity';

@Entity('patient_emergency_contacts')
export class PatientEmergencyContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.emergencyContacts)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 100, nullable: true })
  relationship?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
