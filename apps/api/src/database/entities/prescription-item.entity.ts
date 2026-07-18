import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity';

@Entity('prescription_items')
export class PrescriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prescription_id', type: 'uuid' })
  prescriptionId: string;

  @ManyToOne(() => Prescription, (prescription) => prescription.items)
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Column({ name: 'drug_name', length: 255 })
  drugName: string;

  @Column({ length: 100, nullable: true })
  dosage?: string;

  @Column({ length: 100, nullable: true })
  frequency?: string;

  @Column({ length: 100, nullable: true })
  duration?: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string;
}
