import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoleName } from '@prisma/client';

export class CreateRoleDto {
  @IsEnum(RoleName)
  nom!: RoleName;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
