import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';

export class CreateTestDto {
  @ApiProperty({ description: 'Id del área protegida a la que pertenece.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({ description: 'Título del examen.' })
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido.' })
  title: string;

  @ApiProperty({ description: 'Descripción del examen para el estudiante.' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida.' })
  description: string;

  @ApiProperty({ description: 'Número máximo de intentos permitidos.' })
  @IsInt()
  @Min(1, { message: 'El estudiante debe tener al menos 1 intento.' })
  maxAttempts: number;

  @ApiProperty({
    description:
      'Puntaje mínimo (suma de puntos de preguntas correctas) para aprobar.',
  })
  @IsInt()
  @Min(0, { message: 'El puntaje mínimo no puede ser negativo.' })
  passingScore: number;

  @ApiProperty({
    type: [CreateQuestionDto],
    description: 'Preguntas del examen.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'El examen necesita al menos 1 pregunta.' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
