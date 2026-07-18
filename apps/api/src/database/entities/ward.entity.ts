import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { Department } from './department.entity';
import { Bed } from './bed.entity';

@Entity('wards')
export class Ward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, (department) => department.wards, {
    nullable: true,
  })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  floor?: string;

  @OneToMany(() => Bed, (bed) => bed.ward)
  beds: Bed[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
