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
import { Ward } from './ward.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Ward, (ward) => ward.department)
  wards: Ward[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
