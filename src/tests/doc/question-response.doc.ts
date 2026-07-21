import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Incluye `correctAnswer` — solo se sirve a través de endpoints restringidos
 * a TEACHER (ver TestsController). El runtime del estudiante para presentar
 * el examen debe usar una representación separada que la omita.
 */
@Exclude()
export class QuestionResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  question: string;

  @Expose()
  @ApiProperty({ type: [String] })
  options: string[];

  @Expose()
  @ApiProperty()
  correctAnswer: string;

  @Expose()
  @ApiProperty()
  score: number;
}
