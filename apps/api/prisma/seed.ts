import 'dotenv/config';
import { PrismaClient, RoleName } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Descriptions des rôles
const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  DG: 'Directeur Général — accès total',
  RP: 'Responsable des Prestations',
  RF: 'Responsable Financier',
  RH: 'Ressources Humaines',
  MANAGER: 'Manager de secteur',
  CONTROLEUR: 'Contrôleur terrain',
  SURVEILLANT: 'Surveillant (chef de poste)',
  JURISTE: 'Juriste',
  COMPTABLE: 'Comptable',
  AGENT: 'Agent de sécurité',
};

// Catalogue de permissions (nom → description)
const PERMISSIONS: Record<string, string> = {
  consulterClient: 'Consulter les clients',
  creerClient: 'Créer un client',
  modifierClient: 'Modifier un client',
  creerContrat: 'Créer un contrat',
  validerContrat: 'Valider un contrat',
  consulterFinance: 'Consulter la finance',
  creerFacture: 'Créer une facture',
  validerFacture: 'Valider une facture',
  consulterPlanning: 'Consulter le planning',
  gererPlanning: 'Gérer le planning',
  pointer: 'Effectuer un pointage',
  declarerIncident: 'Déclarer un incident',
  consulterIncident: 'Consulter les incidents',
  cloturerIncident: 'Clôturer un incident',
  consulterRapports: 'Consulter les rapports',
  gererUtilisateurs: 'Gérer les utilisateurs',
  gererRoles: 'Gérer les rôles',
  gererPermissions: 'Gérer les permissions',
};

// Rôle → permissions (DG hérite de tout automatiquement)
const ROLE_PERMISSIONS: Partial<Record<RoleName, string[]>> = {
  RP: ['consulterClient', 'consulterPlanning', 'gererPlanning', 'consulterIncident', 'consulterRapports'],
  RF: ['consulterClient', 'consulterFinance', 'creerFacture', 'validerFacture', 'consulterRapports'],
  RH: ['consulterPlanning', 'consulterRapports'],
  MANAGER: ['consulterClient', 'consulterPlanning', 'consulterIncident'],
  CONTROLEUR: ['consulterPlanning', 'consulterIncident', 'cloturerIncident'],
  SURVEILLANT: ['consulterPlanning', 'pointer', 'declarerIncident', 'consulterIncident'],
  JURISTE: ['consulterClient', 'creerContrat', 'validerContrat', 'consulterRapports'],
  COMPTABLE: ['consulterClient', 'consulterFinance', 'creerFacture'],
  AGENT: ['pointer', 'declarerIncident', 'consulterPlanning'],
};

async function main() {
  // 1) Rôles
  for (const nom of Object.keys(ROLE_DESCRIPTIONS) as RoleName[]) {
    await prisma.role.upsert({
      where: { nom },
      create: { nom, description: ROLE_DESCRIPTIONS[nom] },
      update: { description: ROLE_DESCRIPTIONS[nom] },
    });
  }

  // 2) Permissions
  for (const [nom, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { nom },
      create: { nom, description },
      update: { description },
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const permId = new Map(permissions.map((p) => [p.nom, p.id]));

  // 3) Mappings rôle → permission
  for (const role of roles) {
    const names =
      role.nom === 'DG' ? Object.keys(PERMISSIONS) : ROLE_PERMISSIONS[role.nom] ?? [];
    for (const name of names) {
      const permissionId = permId.get(name);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        create: { roleId: role.id, permissionId },
        update: {},
      });
    }
  }

  // 4) Utilisateur DG de démonstration (+ attribution du rôle DG)
  const dg = await prisma.user.upsert({
    where: { email: 'dg@pilotepme.fr' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nom: 'Diallo',
      prenom: 'Mamadou',
      email: 'dg@pilotepme.fr',
      role: RoleName.DG,
      dateEmbauche: new Date('2020-01-01'),
    },
    update: {},
  });
  const roleDG = roles.find((r) => r.nom === 'DG')!;
  await prisma.utilisateurRole.upsert({
    where: {
      utilisateurId_roleId: { utilisateurId: dg.id, roleId: roleDG.id },
    },
    create: { utilisateurId: dg.id, roleId: roleDG.id, attribueParId: dg.id },
    update: { dateRetrait: null },
  });

  console.log(
    `Seed OK : ${roles.length} rôles, ${permissions.length} permissions, 1 DG démo.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
