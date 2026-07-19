import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Exige une ou plusieurs permissions (toutes requises) sur une route.
 * Vérifiées par `PermissionsGuard` à partir des rôles actifs de l'utilisateur.
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  applyDecorators(SetMetadata(PERMISSIONS_KEY, permissions), ApiBearerAuth());
