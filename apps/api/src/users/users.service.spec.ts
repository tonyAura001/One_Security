import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const fakeUser = {
  id: 'u1',
  nom: 'Diallo',
  prenom: 'Mamadou',
  email: 'dg@pilotepme.fr',
  role: RoleName.DG,
  actif: true,
  dateEmbauche: new Date('2020-01-01'),
  dateDepart: null,
  telephone: null,
  roles: [],
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn().mockResolvedValue(fakeUser),
        findUnique: jest.fn().mockResolvedValue(fakeUser),
        findMany: jest.fn().mockResolvedValue([fakeUser]),
        update: jest.fn().mockResolvedValue(fakeUser),
      },
      role: { findUnique: jest.fn().mockResolvedValue({ id: 'r1' }) },
      utilisateurRole: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('mappe estActif → actif et présente les rôles', async () => {
    const res = await service.create({
      nom: 'Diallo',
      prenom: 'Mamadou',
      email: 'dg@pilotepme.fr',
      role: RoleName.DG,
      dateEmbauche: '2020-01-01',
      estActif: true,
    });
    expect(prisma.user.create.mock.calls[0][0].data.actif).toBe(true);
    expect(res.estActif).toBe(true);
    expect(res.roles).toEqual([]);
  });

  it("trace le DG attribuant lors de l'attribution d'un rôle", async () => {
    await service.assignRole('u1', 'r1', 'dg-id');
    const arg = prisma.utilisateurRole.upsert.mock.calls[0][0];
    expect(arg.create.attribueParId).toBe('dg-id');
    expect(arg.update.dateRetrait).toBeNull();
  });

  it('retire un rôle en posant dateRetrait (soft)', async () => {
    await service.removeRole('u1', 'r1');
    const arg = prisma.utilisateurRole.updateMany.mock.calls[0][0];
    expect(arg.where.dateRetrait).toBeNull();
    expect(arg.data.dateRetrait).toBeInstanceOf(Date);
  });

  it('désactive sans supprimer', async () => {
    await service.deactivate('u1');
    expect(prisma.user.update.mock.calls[0][0].data.actif).toBe(false);
  });

  it('findOne lève NotFound si absent', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
