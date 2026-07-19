import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/** Projection d'un rôle avec ses permissions à plat. */
const roleWithPermissions = {
  include: {
    permissions: { include: { permission: true } },
    _count: { select: { utilisateurs: { where: { dateRetrait: null } } } },
  },
} satisfies Prisma.RoleDefaultArgs;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({ data: dto });
    } catch (e) {
      throw this.mapError(e, dto.nom);
    }
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      ...roleWithPermissions,
      orderBy: { nom: 'asc' },
    });
    return roles.map((r) => this.flatten(r));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      ...roleWithPermissions,
    });
    if (!role) throw new NotFoundException(`Rôle ${id} introuvable.`);
    return this.flatten(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.ensureExists(id);
    await this.prisma.role.update({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    // Les attributions (UtilisateurRole) et liens (RolePermission) sont
    // supprimés en cascade (voir schema).
    await this.prisma.role.delete({ where: { id } });
  }

  /** Attribue une permission à un rôle (idempotent). */
  async addPermission(roleId: string, permissionId: string) {
    await this.ensureExists(roleId);
    await this.ensurePermissionExists(permissionId);
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
    return this.findOne(roleId);
  }

  async removePermission(roleId: string, permissionId: string) {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
    return this.findOne(roleId);
  }

  private flatten(role: Prisma.RoleGetPayload<typeof roleWithPermissions>) {
    return {
      id: role.id,
      nom: role.nom,
      description: role.description,
      nbUtilisateurs: role._count.utilisateurs,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Rôle ${id} introuvable.`);
  }

  private async ensurePermissionExists(id: string): Promise<void> {
    const found = await this.prisma.permission.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Permission ${id} introuvable.`);
  }

  private mapError(e: unknown, nom?: string): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(`Le rôle « ${nom} » existe déjà.`);
    }
    return e as Error;
  }
}
