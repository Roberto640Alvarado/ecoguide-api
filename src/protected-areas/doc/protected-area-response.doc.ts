import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Representación pública de un área protegida.
 * Usar con plainToInstance antes de responder.
 */
@Exclude()
export class ProtectedAreaResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  description: string;

  @Expose()
  @ApiProperty()
  latitude: number;

  @Expose()
  @ApiProperty()
  longitude: number;

  @Expose()
  @ApiProperty({ type: [String] })
  images: string[];

  @Expose()
  @ApiProperty()
  isPublished: boolean;

  @Expose()
  @ApiProperty()
  createdBy: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;
}
