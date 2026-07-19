import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';

const roleRow = {
  id: 'r1',
  nom: RoleName.RF,
  description: 'Responsable Financier',
  permissions: [
    { permission: { id: 'p1', nom: 'consulterFinance', description: null } },
    { permission: { id: 'p2', nom: 'validerFacture', description: null } },
  ],
  _count: { utilisateurs: 3 },
};

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      role: {
        create: jest.fn().mockResolvedValue(roleRow),
        findUnique: jest.fn().mockResolvedValue(roleRow),
      },
      permission: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      rolePermission: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [RolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RolesService);
  });

  it('aplati les permissions et compte les utilisateurs', async () => {
    const res = await service.findOne('r1');
    expect(res.permissions).toHaveLength(2);
    expect(res.nbUtilisateurs).toBe(3);
  });

  it('renvoie 409 sur nom de rôle dupliqué', async () => {
    prisma.role.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '7',
      }),
    );
    await expect(service.create({ nom: RoleName.RF })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('attribue une permission (upsert idempotent)', async () => {
    await service.addPermission('r1', 'p1');
    expect(prisma.rolePermission.upsert).toHaveBeenCalled();
  });
});
