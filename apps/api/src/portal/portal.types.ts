import { Field, ID, ObjectType } from '@nestjs/graphql';
import { AppointmentType } from '../appointments/appointments.types';
import { PrescriptionType } from '../clinical/clinical.types';

@ObjectType()
export class PortalLabResultType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  labOrderId: string;

  @Field()
  testName: string;

  @Field({ nullable: true })
  resultValue?: string;

  @Field({ nullable: true })
  referenceRange?: string;

  @Field({ nullable: true })
  unit?: string;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class PortalPatientProfileType {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  dateOfBirth?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  bloodGroup?: string;

  @Field()
  status: string;
}

@ObjectType()
export class PortalPatientRecordsType {
  @Field(() => PortalPatientProfileType, { nullable: true })
  patient?: PortalPatientProfileType;

  @Field(() => [AppointmentType])
  appointments: AppointmentType[];

  @Field(() => [PrescriptionType])
  prescriptions: PrescriptionType[];

  @Field(() => [PortalLabResultType])
  labResults: PortalLabResultType[];
}
