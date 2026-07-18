import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { UserType } from './users.types';

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => UserType, { name: 'me' })
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): UserType {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      hospitalId: user.hospitalId,
      roles: user.roles,
      permissions: user.permissions,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  @Mutation(() => UserType)
  @UseGuards(GqlAuthGuard)
  async completeOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Args('fullName') fullName: string,
    @Args('hospitalId', { nullable: true }) hospitalId?: string,
    @Args('assignHospitalAdmin', { nullable: true, defaultValue: false })
    assignHospitalAdmin?: boolean,
  ): Promise<UserType> {
    await this.authService.completeOnboarding(
      user,
      fullName,
      hospitalId,
      assignHospitalAdmin ?? false,
    );
    const refreshed = await this.authService.syncAndGetUser(
      user.authId,
      user.email,
    );
    return {
      id: refreshed!.id,
      email: refreshed!.email,
      fullName: refreshed!.fullName,
      hospitalId: refreshed!.hospitalId,
      roles: refreshed!.roles,
      permissions: refreshed!.permissions,
      onboardingCompleted: true,
    };
  }

  @Mutation(() => UserType)
  @UseGuards(GqlAuthGuard)
  async completePatientOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Args('fullName') fullName: string,
  ): Promise<UserType> {
    await this.authService.completePatientOnboarding(user.id, fullName);
    const refreshed = await this.authService.syncAndGetUser(
      user.authId,
      user.email,
    );
    return {
      id: refreshed!.id,
      email: refreshed!.email,
      fullName: refreshed!.fullName,
      hospitalId: refreshed!.hospitalId,
      roles: refreshed!.roles,
      permissions: refreshed!.permissions,
      onboardingCompleted: true,
    };
  }
}
