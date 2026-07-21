import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Representación pública de una práctica de speaking. providerId se expone
 * (el docente necesita verlo/editarlo); el apiKey del proveedor nunca viaja
 * aquí, eso vive exclusivamente en AIProviderResponseDoc.
 */
@Exclude()
export class SpeakingPracticeResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  instructions: string;

  @Expose()
  @ApiProperty()
  providerId: string;

  @Expose()
  @ApiProperty()
  model: string;

  @Expose()
  @ApiProperty()
  prompt: string;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
