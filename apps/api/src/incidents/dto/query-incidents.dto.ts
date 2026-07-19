import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  CriticiteIncident,
  StatutIncident,
  TypeIncident,
} from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryIncidentsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(StatutIncident)
  statut?: StatutIncident;

  @IsOptional()
  @IsEnum(CriticiteIncident)
  criticite?: CriticiteIncident;

  @IsOptional()
  @IsEnum(TypeIncident)
  type?: TypeIncident;

  @IsOptional()
  @IsUUID()
  siteId?: string;
}
