import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Enunciado de la pregunta.' })
  @IsString()
  @IsNotEmpty({ message: 'La pregunta es requerida.' })
  question: string;

  @ApiProperty({
    type: [String],
    description: 'Opciones de respuesta (mínimo 2).',
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Cada pregunta necesita al menos 2 opciones.' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'Las opciones no pueden estar vacías.' })
  options: string[];

  @ApiProperty({
    description: 'Debe coincidir exactamente con una de las opciones.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La respuesta correcta es requerida.' })
  correctAnswer: string;

  @ApiProperty({
    description: 'Puntos que otorga esta pregunta si se acierta.',
  })
  @IsInt()
  @Min(1, { message: 'El puntaje de la pregunta debe ser mayor a 0.' })
  score: number;
}
