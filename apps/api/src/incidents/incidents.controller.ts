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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/auth-user';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';
import { ChangeStatutDto } from './dto/change-statut.dto';

@ApiTags('Incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Post()
  @Roles(
    RoleName.AGENT,
    RoleName.SURVEILLANT,
    RoleName.CONTROLEUR,
    RoleName.MANAGER,
    RoleName.RP,
    RoleName.DG,
  )
  @ApiOperation({ summary: 'Déclarer un incident (main courante)' })
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: AuthUser) {
    return this.incidents.create(dto, user);
  }

  @Get()
  @Roles(
    RoleName.AGENT,
    RoleName.SURVEILLANT,
    RoleName.CONTROLEUR,
    RoleName.MANAGER,
    RoleName.RP,
    RoleName.JURISTE,
    RoleName.DG,
  )
  @ApiOperation({ summary: 'Lister les incidents (filtrés, paginés)' })
  findAll(@Query() query: QueryIncidentsDto, @CurrentUser() user: AuthUser) {
    return this.incidents.findAll(query, user);
  }

  @Get('stats/ouverts')
  @Roles(RoleName.CONTROLEUR, RoleName.MANAGER, RoleName.RP, RoleName.DG)
  @ApiOperation({ summary: 'KPI : incidents ouverts par criticité' })
  stats(@Query('siteId') siteId?: string) {
    return this.incidents.openCountByCriticite(siteId);
  }

  @Get(':id')
  @Roles(
    RoleName.AGENT,
    RoleName.SURVEILLANT,
    RoleName.CONTROLEUR,
    RoleName.MANAGER,
    RoleName.RP,
    RoleName.JURISTE,
    RoleName.DG,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidents.findOne(id);
  }

  @Patch(':id')
  @Roles(
    RoleName.SURVEILLANT,
    RoleName.CONTROLEUR,
    RoleName.MANAGER,
    RoleName.RP,
    RoleName.DG,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidents.update(id, dto);
  }

  @Patch(':id/statut')
  @Roles(RoleName.CONTROLEUR, RoleName.MANAGER, RoleName.RP, RoleName.DG)
  @ApiOperation({ summary: 'Changer le statut (clôture = mesures requises)' })
  changeStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatutDto,
  ) {
    return this.incidents.changeStatut(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.RP, RoleName.DG)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidents.remove(id);
  }
}
