import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import {
  extractEmail,
  isEmailVerified,
  type ClerkJwtPayload,
} from './clerk-jwt.payload';

/**
 * Clerk session tokens are RS256-signed JWTs. Public keys are published at
 *   `${CLERK_ISSUER}/.well-known/jwks.json`
 * so we validate them via `jwks-rsa` + `passport-jwt`.
 */
@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, 'clerk-jwt') {
  private static readonly logger = new Logger(ClerkJwtStrategy.name);
  private readonly authorizedParties: string[];

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const issuer = configService.get<string>('CLERK_ISSUER');
    if (!issuer) {
      throw new Error(
        'CLERK_ISSUER is required to verify Clerk session tokens. See apps/api/.env.example.',
      );
    }

    const jwksUri = `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
    const partiesRaw =
      configService.get<string>('CLERK_AUTHORIZED_PARTIES') ?? '';
    const authorizedParties = partiesRaw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      issuer,
      passReqToCallback: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });

    this.authorizedParties = authorizedParties;
  }

  async validate(payload: ClerkJwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid Clerk token: missing sub');
    }

    if (this.authorizedParties.length > 0) {
      const azp = payload.azp;
      if (!azp || !this.authorizedParties.includes(azp)) {
        ClerkJwtStrategy.logger.warn(
          `Rejected token with unauthorized azp=${azp ?? '(none)'}`,
        );
        throw new UnauthorizedException(
          'Invalid Clerk token: unauthorized party',
        );
      }
    }

    const email = extractEmail(payload);
    const user = await this.authService.syncAndGetUser(
      payload.sub,
      email,
      isEmailVerified(payload),
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
