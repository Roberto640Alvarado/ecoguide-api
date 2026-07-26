import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
} from 'class-validator';
import { TranslationLanguage } from '../enums/translation-language.enum';

const MAX_BATCH_SIZE = 50;

export class TranslateBatchDto {
  @ApiProperty({
    type: [String],
    description:
      'Textos a traducir, en el mismo orden en el que se devuelven las traducciones. Los strings vacíos se devuelven tal cual.',
    example: ['El Parque Nacional El Imposible', 'Descripción del área...'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Se requiere al menos un texto para traducir.' })
  @ArrayMaxSize(MAX_BATCH_SIZE, {
    message: `No se pueden traducir más de ${MAX_BATCH_SIZE} textos a la vez.`,
  })
  @IsString({ each: true })
  texts: string[];

  @ApiProperty({ enum: TranslationLanguage, example: TranslationLanguage.EN })
  @IsEnum(TranslationLanguage, {
    message: 'El idioma de destino no es válido.',
  })
  targetLanguage: TranslationLanguage;
}
