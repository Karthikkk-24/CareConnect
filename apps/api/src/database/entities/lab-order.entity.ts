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
import { Patient } from './patient.entity';
import { Admission } from './admission.entity';
import { User } from './user.entity';
import { LabResult } from './lab-result.entity';

export const LAB_ORDER_STATUSES = [
  'ordered',
  'collected',
  'processing',
  'completed',
  'cancelled',
] as const;

@Entity('lab_orders')
export class LabOrder {
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

  @Column({ name: 'ordered_by', type: 'uuid', nullable: true })
  orderedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ordered_by' })
  orderedBy?: User;

  @Column({ name: 'test_name', length: 255 })
  testName: string;

  @Column({
    type: 'enum',
    enum: LAB_ORDER_STATUSES,
    enumName: 'lab_order_status',
    default: 'ordered',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => LabResult, (result) => result.labOrder)
  results: LabResult[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
