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

  @Field(() => [String])
  roles: string[];

  @Field(() => [String])
  permissions: string[];

  @Field()
  onboardingCompleted: boolean;
}
