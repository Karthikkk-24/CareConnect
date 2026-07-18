import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Hospital } from './hospital.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ name: 'hospital_id', type: 'uuid', nullable: true })
  hospitalId?: string;

  @ManyToOne(() => Hospital, { nullable: true })
  @JoinColumn({ name: 'hospital_id' })
  hospital?: Hospital;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100 })
  resource: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
