import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StaffType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  hospitalId: string;

  @Field()
  fullName: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  roleSlug: string;

  @Field({ nullable: true })
  department?: string;

  @Field({ nullable: true })
  specialization?: string;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;
}

@InputType()
export class CreateStaffInput {
  @Field()
  fullName: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  roleSlug: string;

  @Field({ nullable: true })
  department?: string;

  @Field({ nullable: true })
  specialization?: string;
}

@InputType()
export class UpdateStaffInput {
  @Field({ nullable: true })
  fullName?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  roleSlug?: string;

  @Field({ nullable: true })
  department?: string;

  @Field({ nullable: true })
  specialization?: string;

  @Field({ nullable: true })
  isActive?: boolean;
}
