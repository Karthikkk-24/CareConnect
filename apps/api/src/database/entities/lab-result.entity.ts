import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LabOrder } from './lab-order.entity';
import { Hospital } from './hospital.entity';
import { User } from './user.entity';

@Entity('lab_results')
export class LabResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lab_order_id', type: 'uuid' })
  labOrderId: string;

  @ManyToOne(() => LabOrder, (order) => order.results)
  @JoinColumn({ name: 'lab_order_id' })
  labOrder: LabOrder;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'result_value', type: 'text', nullable: true })
  resultValue?: string;

  @Column({ name: 'reference_range', length: 100, nullable: true })
  referenceRange?: string;

  @Column({ length: 50, nullable: true })
  unit?: string;

  @Column({ name: 'result_file_url', type: 'text', nullable: true })
  resultFileUrl?: string;

  @Column({ name: 'entered_by', type: 'uuid', nullable: true })
  enteredById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'entered_by' })
  enteredBy?: User;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
