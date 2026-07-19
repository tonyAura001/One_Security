import { Test } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { utilisateurRole: { findMany: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AccessControlService);
  });

  it('fait l’union dédupliquée et triée des permissions des rôles actifs', async () => {
    prisma.utilisateurRole.findMany.mockResolvedValue([
      {
        role: {
          permissions: [
            { permission: { nom: 'consulterClient' } },
            { permission: { nom: 'pointer' } },
          ],
        },
      },
      {
        role: {
          permissions: [
            { permission: { nom: 'pointer' } }, // doublon
            { permission: { nom: 'declarerIncident' } },
          ],
        },
      },
    ]);

    const perms = await service.getUserPermissions('u1');
    expect(perms).toEqual(['consulterClient', 'declarerIncident', 'pointer']);
  });

  it('userHasPermission reflète la présence', async () => {
    prisma.utilisateurRole.findMany.mockResolvedValue([
      { role: { permissions: [{ permission: { nom: 'validerFacture' } }] } },
    ]);
    expect(await service.userHasPermission('u1', 'validerFacture')).toBe(true);
    expect(await service.userHasPermission('u1', 'gererRoles')).toBe(false);
  });
});
