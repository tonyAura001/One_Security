import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CriticiteIncident,
  RoleName,
  StatutIncident,
  TypeIncident,
} from '@prisma/client';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';

const agent: AuthUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'agent@pilotepme.fr',
  role: RoleName.AGENT,
};

describe('IncidentsService', () => {
  let service: IncidentsService;
  let prisma: {
    incidentSecurite: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      incidentSecurite: {
        create: jest.fn((args) =>
          Promise.resolve({ id: 'inc-1', ...args.data }),
        ),
        findUnique: jest.fn(),
        update: jest.fn((args) =>
          Promise.resolve({ id: args.where.id, ...args.data }),
        ),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(IncidentsService);
  });

  it("ajoute automatiquement l'agent auteur aux intervenants internes", async () => {
    await service.create(
      { type: TypeIncident.INTRUSION, description: 'Intrusion quai nord' },
      agent,
    );
    const arg = prisma.incidentSecurite.create.mock.calls[0][0];
    expect(arg.data.intervenantsInternes.connect).toContainEqual({
      id: agent.id,
    });
  });

  it('refuse la clôture sans mesures prises', async () => {
    prisma.incidentSecurite.findUnique.mockResolvedValue({
      id: 'inc-1',
      statut: StatutIncident.EN_COURS,
      mesuresPrises: null,
    });
    await expect(
      service.changeStatut('inc-1', { statut: StatutIncident.CLOTURE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('autorise la clôture quand les mesures sont fournies', async () => {
    prisma.incidentSecurite.findUnique.mockResolvedValue({
      id: 'inc-1',
      statut: StatutIncident.EN_COURS,
      mesuresPrises: null,
    });
    await service.changeStatut('inc-1', {
      statut: StatutIncident.CLOTURE,
      mesuresPrises: 'Levée de doute effectuée, RAS.',
    });
    expect(prisma.incidentSecurite.update).toHaveBeenCalled();
  });

  it('interdit de rouvrir un incident clôturé', async () => {
    prisma.incidentSecurite.findUnique.mockResolvedValue({
      id: 'inc-1',
      statut: StatutIncident.CLOTURE,
      mesuresPrises: 'ok',
    });
    await expect(
      service.changeStatut('inc-1', { statut: StatutIncident.EN_COURS }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lève NotFound pour un incident inexistant', async () => {
    prisma.incidentSecurite.findUnique.mockResolvedValue(null);
    await expect(service.findOne('absent')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('criticité disponible pour typage', () => {
    expect(CriticiteIncident.CRITIQUE).toBe('CRITIQUE');
  });
});
