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

@Entity('vital_signs')
export class VitalSign {
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

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recordedBy?: User;

  @Column({ name: 'blood_pressure', length: 20, nullable: true })
  bloodPressure?: string;

  @Column({ name: 'heart_rate', type: 'int', nullable: true })
  heartRate?: number;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  temperature?: number;

  @Column({ type: 'int', nullable: true })
  spo2?: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  height?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
