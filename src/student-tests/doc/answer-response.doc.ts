import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Nunca incluye la respuesta correcta del examen — solo si la del estudiante
 * fue acertada o no (`isCorrect`), igual que ya define el composite type
 * `Answer` en el schema.
 */
@Exclude()
export class AnswerResponseDoc {
  @Expose()
  @ApiProperty()
  questionId: string;

  @Expose()
  @ApiProperty()
  studentAnswer: string;

  @Expose()
  @ApiProperty()
  isCorrect: boolean;
}
