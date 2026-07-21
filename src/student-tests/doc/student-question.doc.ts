import { Exclude, Expose } from 'class-transformer';

/**
 * Representación de una pregunta para que el estudiante la RESPONDA (no para
 * revisar resultados, ver AnswerResponseDoc). Nunca incluye `correctAnswer`
 * — es la razón de ser de este doc, separado del QuestionResponseDoc que
 * usa el docente en /tests.
 */
@Exclude()
export class StudentQuestionDoc {
  @Expose()
  id: string;

  @Expose()
  question: string;

  @Expose()
  options: string[];

  @Expose()
  score: number;
}
