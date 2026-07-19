import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StatutIncident } from '@prisma/client';
import { CreateIncidentDto } from './create-incident.dto';

/**
 * Mise à jour partielle d'un incident. Le changement de `statut` a sa propre
 * route dédiée (`PATCH /:id/statut`) car il porte une règle métier.
 */
export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  @IsOptional()
  @IsEnum(StatutIncident)
  statut?: StatutIncident;
}
