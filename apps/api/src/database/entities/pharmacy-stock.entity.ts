import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';

@Entity('pharmacy_stock')
export class PharmacyStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'drug_name', type: 'varchar', length: 255 })
  drugName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: string;

  @Column({ type: 'varchar', length: 50, default: 'each' })
  unit: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
