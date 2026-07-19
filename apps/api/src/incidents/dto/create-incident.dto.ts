import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CriticiteIncident, TypeIncident } from '@prisma/client';

export class CreateIncidentDto {
  @IsEnum(TypeIncident)
  type!: TypeIncident;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsEnum(CriticiteIncident)
  criticite?: CriticiteIncident;

  /** Horodatage de l'événement (défaut : maintenant). */
  @IsOptional()
  @IsISO8601()
  dateHeure?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  /** Ronde à l'origine du signalement (anomalie). */
  @IsOptional()
  @IsUUID()
  rondeId?: string;

  /** Agents/collaborateurs intervenus. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  intervenantsInternesIds?: string[];

  /** Intervenants externes (pompiers, police…). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intervenantsExternes?: string[];

  @IsOptional()
  @IsString()
  dommagesMateriels?: string;

  @IsOptional()
  @IsString()
  dommagesCorporels?: string;

  @IsOptional()
  @IsString()
  mesuresPrises?: string;
}
