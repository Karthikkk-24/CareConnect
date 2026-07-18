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

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: string;

  @Column({ type: 'varchar', length: 50, default: 'each' })
  unit: string;

  @Column({ name: 'reorder_level', type: 'decimal', precision: 10, scale: 2, default: 0 })
  reorderLevel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
