import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@prisma/client';
import type { AuthUser } from './auth-user';
import { ROLES_KEY } from './decorators';

/**
 * Autorisation par rôle. S'appuie sur `@Roles(...)`. Absence de contrainte
 * → accès autorisé (seul le JWT est requis). L'autorité fait foi ici (API),
 * la RLS Supabase servant de défense en profondeur au niveau DB.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Votre rôle ne permet pas cette opération.');
    }
    return true;
  }
}
