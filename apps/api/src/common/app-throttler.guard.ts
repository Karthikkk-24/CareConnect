import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/**
 * Nest's default ThrottlerGuard uses switchToHttp(), which does not yield
 * Express req/res under GraphQL. Map GraphQL context explicitly (#207).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    if (context.getType<string>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context).getContext<{
        req: Request;
        res: Response;
      }>();
      return {
        req: gqlCtx.req as unknown as Record<string, unknown>,
        res: gqlCtx.res as unknown as Record<string, unknown>,
      };
    }

    const http = context.switchToHttp();
    return {
      req: http.getRequest() as Record<string, unknown>,
      res: http.getResponse() as Record<string, unknown>,
    };
  }
}
