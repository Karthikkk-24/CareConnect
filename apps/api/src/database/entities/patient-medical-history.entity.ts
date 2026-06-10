import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('patient_medical_history')
export class PatientMedicalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.medicalHistory)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'enum', enum: ['past', 'family', 'surgical'] })
  type: string;

  @Column({ length: 255 })
  condition: string;

  @Column({ name: 'diagnosis_date', type: 'date', nullable: true })
  diagnosisDate?: string;

  @Column({ length: 100, nullable: true })
  relation?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
