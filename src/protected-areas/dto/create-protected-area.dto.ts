import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateProtectedAreaDto {
  @ApiProperty({ example: 'Parque Nacional El Imposible' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido.' })
  name: string;

  @ApiProperty({ example: 'Reserva de bosque nuboso en Ahuachapán.' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida.' })
  description: string;

  @ApiProperty({ example: 13.8383 })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90.' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90.' })
  latitude: number;

  @ApiProperty({ example: -89.9333 })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180.' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180.' })
  longitude: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs de las imágenes (subidas previamente vía UploadFiles).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Máximo 10 imágenes por área.' })
  @IsUrl({}, { each: true, message: 'Cada imagen debe ser una URL válida.' })
  images?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
