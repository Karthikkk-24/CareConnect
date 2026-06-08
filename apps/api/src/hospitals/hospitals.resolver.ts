import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalInput, HospitalType } from './hospitals.types';

@Resolver(() => HospitalType)
export class HospitalsResolver {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Query(() => [HospitalType])
  hospitals(): Promise<HospitalType[]> {
    return this.hospitalsService.findAll();
  }

  @Query(() => HospitalType, { nullable: true })
  hospital(@Args('id') id: string): Promise<HospitalType | null> {
    return this.hospitalsService.findById(id);
  }

  @Mutation(() => HospitalType)
  @UseGuards(GqlAuthGuard)
  createHospital(@Args('input') input: CreateHospitalInput): Promise<HospitalType> {
    return this.hospitalsService.create(input);
  }
}
