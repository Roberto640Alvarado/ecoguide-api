import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Id de la pregunta respondida (Question.id).' })
  @IsString()
  @IsNotEmpty({ message: 'El questionId es requerido.' })
  questionId: string;

  @ApiProperty({ description: 'Respuesta elegida por el estudiante.' })
  @IsString()
  @IsNotEmpty({ message: 'La respuesta es requerida.' })
  studentAnswer: string;
}
