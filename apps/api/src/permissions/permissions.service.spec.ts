import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      permission: {
        create: jest.fn().mockResolvedValue({ id: 'p1', nom: 'creerClient' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(PermissionsService);
  });

  it('renvoie 409 sur permission dupliquée', async () => {
    prisma.permission.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '7',
      }),
    );
    await expect(service.create({ nom: 'creerClient' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('findOne lève NotFound si absent', async () => {
    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
