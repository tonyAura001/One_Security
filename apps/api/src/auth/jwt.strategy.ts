import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
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
 * Vérifie le JWT émis par Supabase Auth et construit l'`AuthUser`.
 *
 * Supabase signe désormais les jetons avec des **clés asymétriques (ES256)** :
 * la clé publique est récupérée (et mise en cache) depuis le JWKS du projet
 * (`/auth/v1/.well-known/jwks.json`), sélectionnée par le `kid` de l'en-tête.
 * (Remplace l'ancienne vérification HS256 par secret partagé, incompatible avec
 * les jetons ES256.) Le rôle métier est lu dans `app_metadata.role`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const supabaseUrl = config
      .getOrThrow<string>('SUPABASE_URL')
      .replace(/\/+$/, '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: 'authenticated',
      issuer: `${supabaseUrl}/auth/v1`,
      algorithms: ['ES256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
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
