import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  /** Identifiant technique, ex. `creerClient`, `validerFacture`. */
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: 'nom : lettres/chiffres/underscore, commence par une lettre.',
  })
  @MaxLength(80)
  nom!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
