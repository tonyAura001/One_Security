import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatutIncident } from '@prisma/client';

export class ChangeStatutDto {
  @IsEnum(StatutIncident)
  statut!: StatutIncident;

  /** Requis pour clôturer (traçabilité des mesures prises). */
  @IsOptional()
  @IsString()
  mesuresPrises?: string;
}
