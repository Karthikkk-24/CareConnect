import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('patient_insurance')
export class PatientInsurance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.insuranceRecords)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ length: 255, nullable: true })
  provider?: string;

  @Column({ name: 'policy_number', length: 100, nullable: true })
  policyNumber?: string;

  @Column({ name: 'group_number', length: 100, nullable: true })
  groupNumber?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
