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
  ): Promise<UserType> {
    await this.authService.completeOnboarding(user.id, fullName, hospitalId);
    return {
      ...user,
      fullName,
      hospitalId,
      onboardingCompleted: true,
    };
  }
}
