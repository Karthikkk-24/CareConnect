import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HospitalReportsType {
  @Field(() => Int)
  patientCount: number;

  @Field(() => Int)
  staffCount: number;

  @Field(() => Int)
  appointmentsToday: number;

  @Field(() => Int)
  activeAdmissions: number;

  @Field(() => Float)
  revenueTotal: number;
}
