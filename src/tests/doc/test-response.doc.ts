import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { QuestionResponseDoc } from './question-response.doc';

/**
 * Representación completa del examen, incluidas las respuestas correctas.
 * Exclusiva de TEACHER (ver TestsController) — nunca se expone al
 * estudiante vía HTTP.
 */
@Exclude()
export class TestResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  description: string;

  @Expose()
  @ApiProperty()
  maxAttempts: number;

  @Expose()
  @ApiProperty()
  passingScore: number;

  @Expose()
  @Type(() => QuestionResponseDoc)
  @ApiProperty({ type: [QuestionResponseDoc] })
  questions: QuestionResponseDoc[];

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
