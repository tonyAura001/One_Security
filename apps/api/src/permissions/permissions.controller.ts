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
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/auth-user';
import { AccessControlService } from '../access-control/access-control.service';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @Roles(RoleName.DG)
  @ApiOperation({ summary: 'Lister les permissions' })
  findAll() {
    return this.permissions.findAll();
  }

  @Post()
  @Roles(RoleName.DG)
  create(@Body() dto: CreatePermissionDto) {
    return this.permissions.create(dto);
  }

  @Put(':id')
  @Roles(RoleName.DG)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissions.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.DG)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissions.remove(id);
  }
}

/** Permissions de l'utilisateur connecté (pour le contrôle d'accès front). */
@ApiTags('Permissions')
@Controller('moi')
export class MoiController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'Permissions effectives de l’utilisateur courant' })
  async myPermissions(@CurrentUser() user: AuthUser) {
    return {
      role: user.role,
      permissions: await this.accessControl.getUserPermissions(user.id),
    };
  }
}
