import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** Le `nom` d'un rôle (énum) n'est pas modifiable ; seule la description l'est. */
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['nom'] as const),
) {}
