import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName, StatutIncident } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';
import type { Paginated } from '../common/dto/pagination.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';
import { ChangeStatutDto } from './dto/change-statut.dto';

/** Détail d'incident renvoyé aux clients (relations peuplées). */
const incidentInclude = {
  site: { select: { id: true, nom: true, adresse: true } },
  intervenantsInternes: {
    select: { id: true, nom: true, prenom: true, role: true },
  },
  fichiers: { select: { id: true, nom: true, bucket: true, chemin: true } },
} satisfies Prisma.IncidentSecuriteInclude;

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Déclare un incident (main courante). L'auteur agent/surveillant est
   * automatiquement ajouté aux intervenants internes.
   */
  async create(dto: CreateIncidentDto, user: AuthUser) {
    const intervenants = new Set(dto.intervenantsInternesIds ?? []);
    if (user.role === RoleName.AGENT || user.role === RoleName.SURVEILLANT) {
      intervenants.add(user.id);
    }

    return this.prisma.incidentSecurite.create({
      data: {
        type: dto.type,
        description: dto.description,
        criticite: dto.criticite,
        dateHeure: dto.dateHeure ? new Date(dto.dateHeure) : undefined,
        dommagesMateriels: dto.dommagesMateriels,
        dommagesCorporels: dto.dommagesCorporels,
        mesuresPrises: dto.mesuresPrises,
        intervenantsExternes: dto.intervenantsExternes ?? [],
        site: dto.siteId ? { connect: { id: dto.siteId } } : undefined,
        ronde: dto.rondeId ? { connect: { id: dto.rondeId } } : undefined,
        intervenantsInternes: intervenants.size
          ? { connect: [...intervenants].map((id) => ({ id })) }
          : undefined,
      },
      include: incidentInclude,
    });
  }

  /**
   * Liste filtrée + paginée. Un AGENT ne voit que les incidents où il est
   * intervenant (cloisonnement) ; les autres rôles voient tout le périmètre.
   */
  async findAll(
    query: QueryIncidentsDto,
    user: AuthUser,
  ): Promise<Paginated<Awaited<ReturnType<typeof this.findOne>>>> {
    const where: Prisma.IncidentSecuriteWhereInput = {
      statut: query.statut,
      criticite: query.criticite,
      type: query.type,
      siteId: query.siteId,
    };

    if (user.role === RoleName.AGENT) {
      where.intervenantsInternes = { some: { id: user.id } };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.incidentSecurite.findMany({
        where,
        include: incidentInclude,
        orderBy: { dateHeure: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.incidentSecurite.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string) {
    const incident = await this.prisma.incidentSecurite.findUnique({
      where: { id },
      include: incidentInclude,
    });
    if (!incident) {
      throw new NotFoundException(`Incident ${id} introuvable.`);
    }
    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto) {
    await this.ensureExists(id);
    const { intervenantsInternesIds, dateHeure, siteId, rondeId, ...rest } =
      dto;
    return this.prisma.incidentSecurite.update({
      where: { id },
      data: {
        ...rest,
        dateHeure: dateHeure ? new Date(dateHeure) : undefined,
        site: siteId ? { connect: { id: siteId } } : undefined,
        ronde: rondeId ? { connect: { id: rondeId } } : undefined,
        intervenantsInternes: intervenantsInternesIds
          ? { set: intervenantsInternesIds.map((uid) => ({ id: uid })) }
          : undefined,
      },
      include: incidentInclude,
    });
  }

  /**
   * Transition de statut avec règle métier : la clôture exige que des
   * `mesuresPrises` soient renseignées (traçabilité). On interdit aussi de
   * rouvrir un incident déjà clôturé.
   */
  async changeStatut(id: string, dto: ChangeStatutDto) {
    const incident = await this.findOne(id);

    if (incident.statut === StatutIncident.CLOTURE) {
      throw new ForbiddenException('Un incident clôturé ne peut être rouvert.');
    }

    if (dto.statut === StatutIncident.CLOTURE) {
      const mesures = dto.mesuresPrises ?? incident.mesuresPrises;
      if (!mesures || mesures.trim().length === 0) {
        throw new BadRequestException(
          'La clôture nécessite de renseigner les mesures prises.',
        );
      }
    }

    return this.prisma.incidentSecurite.update({
      where: { id },
      data: {
        statut: dto.statut,
        mesuresPrises: dto.mesuresPrises ?? undefined,
      },
      include: incidentInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.incidentSecurite.delete({ where: { id } });
  }

  /** KPI dashboard : nb d'incidents ouverts (non clôturés) par criticité. */
  async openCountByCriticite(siteId?: string) {
    const grouped = await this.prisma.incidentSecurite.groupBy({
      by: ['criticite'],
      where: { statut: { not: StatutIncident.CLOTURE }, siteId },
      _count: { _all: true },
    });
    return grouped.map((g) => ({
      criticite: g.criticite,
      count: g._count._all,
    }));
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.incidentSecurite.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Incident ${id} introuvable.`);
  }
}
