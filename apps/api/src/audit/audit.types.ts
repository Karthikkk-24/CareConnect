import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuditLogType {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  actorId?: string;

  @Field({ nullable: true })
  actorEmail?: string;

  @Field({ nullable: true })
  actorName?: string;

  @Field(() => ID, { nullable: true })
  hospitalId?: string;

  @Field()
  action: string;

  @Field()
  resource: string;

  @Field(() => ID, { nullable: true })
  resourceId?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class AuditLogsPageType {
  @Field(() => [AuditLogType])
  items: AuditLogType[];

  @Field(() => Int)
  total: number;
}
