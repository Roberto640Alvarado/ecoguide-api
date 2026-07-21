import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlashCardType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateFlashCardDto {
  @ApiProperty({ description: 'Id del área protegida a la que pertenece.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({ enum: FlashCardType })
  @IsEnum(FlashCardType, { message: 'El tipo de flashcard no es válido.' })
  type: FlashCardType;

  @ApiProperty({ example: 'La importancia del bosque nuboso' })
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido.' })
  title: string;

  @ApiProperty({ example: 'El bosque nuboso alberga especies endémicas...' })
  @IsString()
  @IsNotEmpty({ message: 'El contenido es requerido.' })
  content: string;

  @ApiPropertyOptional({ description: 'URL de la imagen de apoyo.' })
  @IsOptional()
  @IsUrl({}, { message: 'La imagen debe ser una URL válida.' })
  image?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description:
      'Posición de la flashcard. Si se omite, el servicio la asigna ' +
      'automáticamente según la secuencia fija de categorías (WELCOME, ' +
      'GASTRONOMY, FLORA_FAUNA, ENVIRONMENTAL, CURIOUS_FACT, VOCABULARY) y ' +
      'la cantidad de flashcards existentes de ese mismo tipo en el área.',
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'El orden debe ser mayor o igual a 1.' })
  order?: number;

  @ApiPropertyOptional({
    description: 'Requerido solo cuando type = ENVIRONMENTAL.',
  })
  @ValidateIf(
    (dto: CreateFlashCardDto) => dto.type === FlashCardType.ENVIRONMENTAL,
  )
  @IsString()
  @IsNotEmpty({
    message: 'La pregunta es requerida para flashcards de tipo ENVIRONMENTAL.',
  })
  question?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Requerido solo cuando type = ENVIRONMENTAL (mínimo 2 opciones).',
  })
  @ValidateIf(
    (dto: CreateFlashCardDto) => dto.type === FlashCardType.ENVIRONMENTAL,
  )
  @IsArray()
  @ArrayMinSize(2, {
    message:
      'Debe haber al menos 2 opciones para flashcards de tipo ENVIRONMENTAL.',
  })
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({
    description: 'Requerido solo cuando type = ENVIRONMENTAL.',
  })
  @ValidateIf(
    (dto: CreateFlashCardDto) => dto.type === FlashCardType.ENVIRONMENTAL,
  )
  @IsString()
  @IsNotEmpty({
    message:
      'La respuesta correcta es requerida para flashcards de tipo ENVIRONMENTAL.',
  })
  correctAnswer?: string;
}
