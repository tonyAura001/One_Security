import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Résolution des permissions effectives d'un utilisateur = union des
 * permissions de ses rôles ACTIFS (attribution non retirée). Source de vérité
 * pour `PermissionsGuard` et l'endpoint `/moi/permissions`.
 */
@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const rows = await this.prisma.utilisateurRole.findMany({
      where: { utilisateurId: userId, dateRetrait: null },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: { select: { nom: true } } },
            },
          },
        },
      },
    });

    const perms = new Set<string>();
    for (const row of rows) {
      for (const rp of row.role.permissions) {
        perms.add(rp.permission.nom);
      }
    }
    return [...perms].sort();
  }

  async userHasPermission(
    userId: string,
    permission: string,
  ): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    return perms.includes(permission);
  }
}
