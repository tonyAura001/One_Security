import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../auth/auth-user';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { AccessControlService } from './access-control.service';

/**
 * Guard global de permissions fines. N'agit que sur les routes annotées
 * `@Permissions(...)` ; exige que l'utilisateur possède TOUTES les permissions
 * demandées (dérivées de ses rôles actifs).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const perms = await this.accessControl.getUserPermissions(user.id);
    const missing = required.filter((p) => !perms.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Permission(s) requise(s) : ${missing.join(', ')}.`,
      );
    }
    return true;
  }
}
