import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSpeakingPracticeDto {
  @ApiProperty({ description: 'Id del área protegida a la que pertenece.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({ example: 'Describe el bosque nuboso' })
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido.' })
  title: string;

  @ApiProperty({
    description:
      'Indicaciones que verá el estudiante antes de grabar (qué se espera que haga).',
  })
  @IsString()
  @IsNotEmpty({ message: 'Las indicaciones son requeridas.' })
  instructions: string;

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
      'Prompt/instrucción de sistema que recibirá la IA para evaluar el audio del estudiante y generar retroalimentación. Nunca se hardcodea en código: el docente lo define aquí.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El prompt es requerido.' })
  prompt: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
