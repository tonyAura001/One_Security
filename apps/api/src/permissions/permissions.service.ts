import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    try {
      return await this.prisma.permission.create({ data: dto });
    } catch (e) {
      throw this.mapError(e, dto.nom);
    }
  }

  findAll() {
    return this.prisma.permission.findMany({ orderBy: { nom: 'asc' } });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission)
      throw new NotFoundException(`Permission ${id} introuvable.`);
    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto) {
    await this.findOne(id);
    try {
      return await this.prisma.permission.update({ where: { id }, data: dto });
    } catch (e) {
      throw this.mapError(e, dto.nom);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.permission.delete({ where: { id } });
  }

  private mapError(e: unknown, nom?: string): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(`La permission « ${nom} » existe déjà.`);
    }
    return e as Error;
  }
}
