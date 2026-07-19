import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

/**
 * Module d'authentification : enregistre la stratégie JWT Supabase.
 * Les guards (`JwtAuthGuard`, `RolesGuard`) sont branchés globalement dans
 * `AppModule` via `APP_GUARD`.
 */
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
