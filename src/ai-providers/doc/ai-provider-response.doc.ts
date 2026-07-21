import { ApiProperty } from '@nestjs/swagger';
import { AIProviderType } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';
import { ModelResponseDoc } from './model-response.doc';

/**
 * Representación pública de un proveedor de IA. apiKeyEncrypted se excluye
 * siempre: ningún endpoint debe devolver la API key, ni cifrada ni en claro.
 */
@Exclude()
export class AIProviderResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  providerName: string;

  @Expose()
  @ApiProperty({ enum: AIProviderType })
  providerType: AIProviderType;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @Type(() => ModelResponseDoc)
  @ApiProperty({ type: [ModelResponseDoc] })
  models: ModelResponseDoc[];

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
