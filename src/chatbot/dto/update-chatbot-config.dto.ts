import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateChatbotConfigDto } from './create-chatbot-config.dto';

/**
 * protectedAreaId se excluye intencionalmente: el chatbot config es 1:1 con
 * el área (@unique en schema.prisma) y no cambia de área una vez creado.
 */
export class UpdateChatbotConfigDto extends PartialType(
  OmitType(CreateChatbotConfigDto, ['protectedAreaId'] as const),
) {}
