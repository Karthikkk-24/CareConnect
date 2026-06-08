import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from './auth.types';
import { AuthService } from './auth.service';

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('SUPABASE_JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret ?? 'development-secret',
      algorithms: ['HS256'],
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.authService.syncAndGetUser(payload.sub, payload.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

export function verifySupabaseToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
}
