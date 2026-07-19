import { OmitType, PartialType } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/** MàJ d'un utilisateur (id/email non modifiables ici). */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['id', 'email'] as const),
) {
  @IsOptional()
  @IsISO8601()
  dateDepart?: string;
}
