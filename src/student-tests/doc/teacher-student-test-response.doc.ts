import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * A diferencia de AnswerResponseDoc (vista del estudiante, nunca incluye la
 * respuesta correcta), esta variante sí embebe `question`/`options`/
 * `correctAnswer` — solo se sirve a través de endpoints restringidos a
 * TEACHER (ver StudentTestsController, rutas `teacher/...`).
 */
@Exclude()
export class TeacherAnswerResponseDoc {
  @Expose()
  @ApiProperty()
  questionId: string;

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
  studentAnswer: string;

  @Expose()
  @ApiProperty()
  isCorrect: boolean;

  @Expose()
  @ApiProperty({ description: 'Puntos que vale la pregunta.' })
  points: number;
}

@Exclude()
export class TeacherStudentTestResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  testId: string;

  @Expose()
  @ApiProperty()
  attempt: number;

  @Expose()
  @ApiProperty()
  score: number;

  @Expose()
  @ApiProperty()
  passingScore: number;

  @Expose()
  @ApiProperty()
  passed: boolean;

  @Expose()
  @Type(() => TeacherAnswerResponseDoc)
  @ApiProperty({ type: [TeacherAnswerResponseDoc] })
  answers: TeacherAnswerResponseDoc[];

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
