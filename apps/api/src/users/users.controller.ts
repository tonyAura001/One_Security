import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/auth-user';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Utilisateurs')
@Controller('utilisateurs')
@Roles(RoleName.DG) // gestion des accès réservée au DG
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs avec leurs rôles' })
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/desactiver')
  @ApiOperation({ summary: 'Désactiver un utilisateur (sans le supprimer)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.deactivate(id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Attribuer un rôle (traçe le DG attribuant)' })
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() acteur: AuthUser,
  ) {
    return this.users.assignRole(id, dto.roleId, acteur.id);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Retirer un rôle à un utilisateur' })
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.users.removeRole(id, roleId);
  }
}
