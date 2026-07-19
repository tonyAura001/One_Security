import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleName } from '@prisma/client';

/**
 * Création d'un utilisateur. Le mot de passe n'est pas géré ici : l'auth passe
 * par Supabase Auth. `id` peut reprendre l'UID Supabase pour lier les comptes.
 */
export class CreateUserDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  prenom!: string;

  @IsEmail()
  email!: string;

  /** Rôle primaire (affichage + guard coarse). */
  @IsEnum(RoleName)
  role!: RoleName;

  @IsISO8601()
  dateEmbauche!: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsBoolean()
  estActif?: boolean;
}
