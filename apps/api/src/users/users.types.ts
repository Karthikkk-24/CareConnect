import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  fullName: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  hospitalId?: string;

  /** False when the user's bound hospital is deactivated. */
  @Field()
  hospitalActive: boolean;

  @Field(() => [String])
  roles: string[];

  @Field(() => [String])
  permissions: string[];

  @Field()
  onboardingCompleted: boolean;
}

@ObjectType()
export class UserSummaryType {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  avatarUrl?: string;
}
