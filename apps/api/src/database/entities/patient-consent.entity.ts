import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('patient_consents')
export class PatientConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.consents)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'consent_type', type: 'enum', enum: ['treatment', 'data_sharing', 'research'] })
  consentType: string;

  @Column({ default: false })
  granted: boolean;

  @Column({ name: 'granted_at', type: 'timestamptz', nullable: true })
  grantedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
