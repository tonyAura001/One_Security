import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RoleName } from '@prisma/client';
import type { AuthUser } from './auth-user';

/** Claims d'un JWT Supabase (subset utile). */
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  app_metadata?: { role?: RoleName };
  user_metadata?: Record<string, unknown>;
}

/**
 * Vérifie le JWT émis par Supabase Auth (HS256, secret projet) et construit
 * l'`AuthUser`. Le rôle métier est lu depuis `app_metadata.role`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SUPABASE_JWT_SECRET'),
      audience: 'authenticated',
    });
  }

  validate(payload: SupabaseJwtPayload): AuthUser {
    const role = payload.app_metadata?.role;
    if (!payload.sub || !role) {
      throw new UnauthorizedException('Jeton invalide : rôle manquant.');
    }
    return { id: payload.sub, email: payload.email ?? '', role };
  }
}
