import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Projection utilisateur + rôles ACTIFS (attribution non retirée). */
const userWithRoles = {
  include: {
    roles: {
      where: { dateRetrait: null },
      include: { role: true },
      orderBy: { dateAttribution: 'asc' },
    },
  },
} satisfies Prisma.UserDefaultArgs;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          id: dto.id,
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email,
          role: dto.role,
          dateEmbauche: new Date(dto.dateEmbauche),
          telephone: dto.telephone,
          actif: dto.estActif ?? true,
        },
        ...userWithRoles,
      });
      return this.present(user);
    } catch (e) {
      throw this.mapError(e, dto.email);
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      ...userWithRoles,
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    return users.map((u) => this.present(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      ...userWithRoles,
    });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    return this.present(user);
  }

  /**
   * Profil de l'utilisateur courant, projeté sur le contrat attendu par le
   * frontend PilotePME : identité en anglais (`firstName`/`lastName`/`phone`)
   * et rôle en slug minuscule (`dg`, `agent`, …). Sert l'endpoint `GET /me`
   * (voir `MeController`). Un compte désactivé est refusé (403).
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        role: true,
        telephone: true,
        avatarUrl: true,
        actif: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (!user.actif) throw new ForbiddenException('Compte désactivé.');
    return {
      id: user.id,
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      role: user.role.toLowerCase(),
      phone: user.telephone ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        role: dto.role,
        telephone: dto.telephone,
        actif: dto.estActif,
        dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : undefined,
        dateDepart: dto.dateDepart ? new Date(dto.dateDepart) : undefined,
      },
      ...userWithRoles,
    });
    return this.present(user);
  }

  /** Désactive un compte (sans le supprimer) + date de départ. */
  async deactivate(id: string) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { actif: false, dateDepart: new Date() },
      ...userWithRoles,
    });
    return this.present(user);
  }

  /**
   * Attribue un rôle à un utilisateur (idempotent). `attribueParId` = le DG
   * qui réalise l'action (traçabilité). Réactive une attribution retirée.
   */
  async assignRole(userId: string, roleId: string, attribueParId: string) {
    await this.ensureExists(userId);
    await this.ensureRoleExists(roleId);
    await this.prisma.utilisateurRole.upsert({
      where: { utilisateurId_roleId: { utilisateurId: userId, roleId } },
      create: { utilisateurId: userId, roleId, attribueParId },
      update: { dateRetrait: null, dateAttribution: new Date(), attribueParId },
    });
    return this.findOne(userId);
  }

  /** Retire un rôle (soft : `dateRetrait`, conserve l'historique). */
  async removeRole(userId: string, roleId: string) {
    await this.ensureExists(userId);
    await this.prisma.utilisateurRole.updateMany({
      where: { utilisateurId: userId, roleId, dateRetrait: null },
      data: { dateRetrait: new Date() },
    });
    return this.findOne(userId);
  }

  private present(user: Prisma.UserGetPayload<typeof userWithRoles>) {
    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      estActif: user.actif,
      dateEmbauche: user.dateEmbauche,
      dateDepart: user.dateDepart,
      telephone: user.telephone,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        nom: ur.role.nom,
        description: ur.role.description,
        dateAttribution: ur.dateAttribution,
      })),
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Utilisateur ${id} introuvable.`);
  }

  private async ensureRoleExists(id: string): Promise<void> {
    const found = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Rôle ${id} introuvable.`);
  }

  private mapError(e: unknown, email?: string): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(`L'email « ${email} » est déjà utilisé.`);
    }
    return e as Error;
  }
}
