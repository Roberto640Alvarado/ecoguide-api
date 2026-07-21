import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateFlashCardDto } from './create-flash-card.dto';

/**
 * protectedAreaId se excluye intencionalmente: una flashcard no debe poder
 * "moverse" de área protegida vía update, solo editarse dentro de la misma.
 */
export class UpdateFlashCardDto extends PartialType(
  OmitType(CreateFlashCardDto, ['protectedAreaId'] as const),
) {}
