import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSpeakingPracticeDto } from './create-speaking-practice.dto';

/**
 * protectedAreaId se excluye intencionalmente: una práctica de speaking no
 * cambia de área una vez creada (es 1:1, ver schema.prisma).
 */
export class UpdateSpeakingPracticeDto extends PartialType(
  OmitType(CreateSpeakingPracticeDto, ['protectedAreaId'] as const),
) {}
