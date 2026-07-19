import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@ApiTags('Rôles')
@Controller('roles')
@Roles(RoleName.DG) // administration réservée au DG
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les rôles avec leurs permissions' })
  findAll() {
    return this.roles.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.remove(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Attribuer une permission à un rôle' })
  addPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.roles.addPermission(id, dto.permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @ApiOperation({ summary: 'Retirer une permission d’un rôle' })
  removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.roles.removePermission(id, permissionId);
  }
}
