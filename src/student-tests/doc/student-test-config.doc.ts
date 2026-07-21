import { Exclude, Expose, Type } from 'class-transformer';
import { StudentQuestionDoc } from './student-question.doc';

/**
 * Config del examen que el estudiante necesita para RESOLVERLO: preguntas
 * sin `correctAnswer`, más cuántos intentos ya usó y le quedan (calculado
 * por StudentTestsService, no persistido). El docente ve la versión
 * completa (con `correctAnswer`) en TestResponseDoc vía /tests.
 */
@Exclude()
export class StudentTestConfigDoc {
  @Expose()
  id: string;

  @Expose()
  protectedAreaId: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  maxAttempts: number;

  @Expose()
  passingScore: number;

  @Expose()
  attemptsUsed: number;

  @Expose()
  attemptsRemaining: number;

  @Expose()
  @Type(() => StudentQuestionDoc)
  questions: StudentQuestionDoc[];
}
