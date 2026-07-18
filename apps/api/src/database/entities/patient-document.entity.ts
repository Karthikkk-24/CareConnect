import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { User } from './user.entity';

@Entity('patient_documents')
export class PatientDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, (p) => p.documents)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ name: 'file_type', length: 100, nullable: true })
  fileType?: string;

  @Column({ name: 'document_type', length: 100, nullable: true })
  documentType?: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
