import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Patient } from './patient.entity';
import { Admission } from './admission.entity';
import { User } from './user.entity';

@Entity('diagnoses')
export class Diagnosis {
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

  @Column({ name: 'doctor_id', type: 'uuid', nullable: true })
  doctorId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: User;

  @Column({ name: 'icd_code', length: 20, nullable: true })
  icdCode?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'diagnosed_at', type: 'timestamptz' })
  diagnosedAt: Date;
}
