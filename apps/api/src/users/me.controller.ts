import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth-user';
import { UsersService } from './users.service';

/**
 * Profil de l'utilisateur connecté — point d'entrée du frontend PilotePME.
 *
 * Route `GET /me` (soit `/api/me` avec le préfixe global). Protégée par le
 * `JwtAuthGuard` global : tout utilisateur authentifié y accède (pas de
 * `@Roles`), et le profil est résolu depuis le token (`req.user.id`), jamais
 * via un `:id` — contrairement à `GET /utilisateurs/:id` (réservé au DG).
 */
@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Profil de l’utilisateur courant' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.id);
  }
}
