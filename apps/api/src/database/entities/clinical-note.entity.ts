import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Patient } from './patient.entity';
import { Admission } from './admission.entity';
import { User } from './user.entity';

@Entity('clinical_notes')
export class ClinicalNote {
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

  @Column({ name: 'admission_id', type: 'uuid', nullable: true })
  admissionId?: string;

  @ManyToOne(() => Admission, { nullable: true })
  @JoinColumn({ name: 'admission_id' })
  admission?: Admission;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ type: 'text', nullable: true })
  subjective?: string;

  @Column({ type: 'text', nullable: true })
  objective?: string;

  @Column({ type: 'text', nullable: true })
  assessment?: string;

  @Column({ type: 'text', nullable: true })
  plan?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
