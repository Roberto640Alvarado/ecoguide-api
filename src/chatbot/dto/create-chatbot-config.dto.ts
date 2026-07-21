import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateChatbotConfigDto {
  @ApiProperty({ description: 'Id del área protegida a la que pertenece.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({ description: 'Id del AIProvider configurado por el docente.' })
  @IsMongoId({ message: 'El providerId no es un id válido.' })
  providerId: string;

  @ApiProperty({
    example: 'gemini-1.5-flash',
    description:
      'Identificador del modelo (debe existir y estar activo en el catálogo del proveedor).',
  })
  @IsString()
  @IsNotEmpty({ message: 'El modelo es requerido.' })
  model: string;

  @ApiProperty({
    description:
      'Prompt de sistema: rol, tema permitido y reglas de comportamiento del chatbot. Nunca se hardcodea en código.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El systemPrompt es requerido.' })
  systemPrompt: string;

  @ApiProperty({
    description:
      'Primer mensaje que el estudiante ve al abrir la conversación.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje de bienvenida es requerido.' })
  welcomeMessage: string;

  @ApiPropertyOptional({ default: 0.7, minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'La temperatura mínima es 0.' })
  @Max(2, { message: 'La temperatura máxima es 2.' })
  temperature?: number;

  @ApiPropertyOptional({ default: 2048, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxTokens debe ser mayor a 0.' })
  maxTokens?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
