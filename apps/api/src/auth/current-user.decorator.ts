import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types';

type AuthedRequest = Request & { user?: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<{ req: AuthedRequest }>();
    const user = gqlContext.req?.user;
    if (!user) {
      throw new Error('Authenticated user missing from request context');
    }
    return user;
  },
);
