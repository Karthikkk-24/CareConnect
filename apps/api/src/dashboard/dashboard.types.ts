import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DashboardStatsType {
  @Field(() => Int)
  appointmentsToday: number;

  @Field(() => Int)
  activeAdmissions: number;
}
