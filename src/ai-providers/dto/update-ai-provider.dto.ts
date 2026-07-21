import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAIProviderDto } from './create-ai-provider.dto';

/**
 * models se excluye intencionalmente: el catálogo de modelos se administra
 * con sus propios endpoints (POST/PATCH/DELETE /ai-providers/:id/models),
 * no reemplazando el array completo vía este PATCH general.
 */
export class UpdateAIProviderDto extends PartialType(
  OmitType(CreateAIProviderDto, ['models'] as const),
) {}
