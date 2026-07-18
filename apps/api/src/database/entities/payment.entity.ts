import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Invoice } from './invoice.entity';
import { User } from './user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50 })
  method: string;

  @Column({ name: 'paid_at', type: 'timestamptz' })
  paidAt: Date;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recordedBy?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
