import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIProviderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateModelDto } from './create-model.dto';

export class CreateAIProviderDto {
  @ApiProperty({ example: 'Google Gemini' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proveedor es requerido.' })
  providerName: string;

  @ApiProperty({
    enum: AIProviderType,
    description:
      'Vendor real del proveedor (determina qué integración de IA se usa ' +
      'para llamarlo). providerName es solo la etiqueta que el docente le ' +
      'da; providerType es el que importa para la lógica interna.',
  })
  @IsEnum(AIProviderType, {
    message: 'El tipo de proveedor no es válido.',
  })
  providerType: AIProviderType;

  @ApiProperty({
    description:
      'API key en texto plano. Se cifra antes de guardarse y nunca se devuelve.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El apiKey es requerido.' })
  apiKey: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [CreateModelDto],
    description: 'Modelos iniciales del proveedor (opcional).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModelDto)
  models?: CreateModelDto[];
}
