import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBadgeDto } from './create-badge.dto';

/**
 * protectedAreaId se excluye intencionalmente: una insignia no debe poder
 * "moverse" de área protegida vía update, solo editarse dentro de la misma
 * (mismo patrón que UpdateFlashCardDto).
 */
export class UpdateBadgeDto extends PartialType(
  OmitType(CreateBadgeDto, ['protectedAreaId'] as const),
) {}
