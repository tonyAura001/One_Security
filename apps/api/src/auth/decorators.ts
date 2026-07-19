import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RoleName } from '@prisma/client';
import type { AuthUser } from './auth-user';

/** Marque une route comme publique (contourne le guard JWT global). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restreint une route à une liste de rôles (via `RolesGuard`). */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]) =>
  applyDecorators(SetMetadata(ROLES_KEY, roles), ApiBearerAuth());

/** Injecte l'utilisateur authentifié (`req.user`) dans un handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
