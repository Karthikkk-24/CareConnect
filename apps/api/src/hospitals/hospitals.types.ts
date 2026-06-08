import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HospitalType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  country?: string;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;
}

@InputType()
export class CreateHospitalInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  country?: string;
}
