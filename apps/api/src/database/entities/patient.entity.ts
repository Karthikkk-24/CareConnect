import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hospital } from './hospital.entity';
import { User } from './user.entity';
import { PatientEmergencyContact } from './patient-emergency-contact.entity';
import { PatientInsurance } from './patient-insurance.entity';
import { PatientAllergy } from './patient-allergy.entity';
import { PatientMedication } from './patient-medication.entity';
import { PatientMedicalHistory } from './patient-medical-history.entity';
import { PatientDocument } from './patient-document.entity';
import { PatientConsent } from './patient-consent.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', type: 'uuid' })
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({
    type: 'enum',
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    nullable: true,
  })
  gender?: string;

  @Column({ name: 'blood_group', length: 10, nullable: true })
  bloodGroup?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  state?: string;

  @Column({ name: 'zip_code', length: 20, nullable: true })
  zipCode?: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ length: 100, nullable: true })
  occupation?: string;

  @Column({ name: 'identification_type', length: 50, nullable: true })
  identificationType?: string;

  @Column({ name: 'identification_number', length: 100, nullable: true })
  identificationNumber?: string;

  @Column({ name: 'primary_care_physician', length: 255, nullable: true })
  primaryCarePhysician?: string;

  @Column({
    type: 'enum',
    enum: ['registered', 'checked_in', 'admitted', 'discharged', 'inactive'],
    default: 'registered',
  })
  status: string;

  @OneToMany(() => PatientEmergencyContact, (c) => c.patient)
  emergencyContacts: PatientEmergencyContact[];

  @OneToMany(() => PatientInsurance, (i) => i.patient)
  insuranceRecords: PatientInsurance[];

  @OneToMany(() => PatientAllergy, (a) => a.patient)
  allergies: PatientAllergy[];

  @OneToMany(() => PatientMedication, (m) => m.patient)
  medications: PatientMedication[];

  @OneToMany(() => PatientMedicalHistory, (h) => h.patient)
  medicalHistory: PatientMedicalHistory[];

  @OneToMany(() => PatientDocument, (d) => d.patient)
  documents: PatientDocument[];

  @OneToMany(() => PatientConsent, (c) => c.patient)
  consents: PatientConsent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
