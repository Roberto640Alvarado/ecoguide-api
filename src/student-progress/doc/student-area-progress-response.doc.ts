import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class FlashCardsProgressDoc {
  @Expose()
  @ApiProperty({
    description: 'Si el área tiene flashcards configuradas por el docente.',
  })
  available: boolean;

  @Expose()
  @ApiProperty({ description: 'Si el estudiante terminó de ver el mazo.' })
  completed: boolean;
}

@Exclude()
export class SpeakingProgressDoc {
  @Expose()
  @ApiProperty({
    description: 'Si el área tiene una práctica de speaking configurada.',
  })
  available: boolean;

  @Expose()
  @ApiProperty()
  attempts: number;

  @Expose()
  @ApiProperty({ nullable: true })
  bestScore: number | null;
}

@Exclude()
export class ChatbotProgressDoc {
  @Expose()
  @ApiProperty({ description: 'Si el área tiene un chatbot configurado.' })
  available: boolean;

  @Expose()
  @ApiProperty()
  conversations: number;

  @Expose()
  @ApiProperty()
  finishedConversations: number;
}

@Exclude()
export class TestProgressDoc {
  @Expose()
  @ApiProperty({ description: 'Si el área tiene un examen configurado.' })
  available: boolean;

  @Expose()
  @ApiProperty()
  attemptsUsed: number;

  @Expose()
  @ApiProperty({ nullable: true })
  maxAttempts: number | null;

  @Expose()
  @ApiProperty({ nullable: true })
  bestScore: number | null;

  @Expose()
  @ApiProperty({ nullable: true })
  passingScore: number | null;

  @Expose()
  @ApiProperty()
  passed: boolean;
}

/**
 * Avance del estudiante en un área protegida. `stepsTotal` solo cuenta los
 * pasos que el docente configuró para esa área (si no hay práctica de
 * speaking, por ejemplo, no cuenta contra el total) — así el % de avance
 * nunca queda incompleto por contenido que ni siquiera existe.
 */
@Exclude()
export class StudentAreaProgressDoc {
  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  areaName: string;

  @Expose()
  @ApiProperty({ nullable: true })
  areaImage: string | null;

  @Expose()
  @ApiProperty()
  stepsCompleted: number;

  @Expose()
  @ApiProperty()
  stepsTotal: number;

  @Expose()
  @ApiProperty({
    description: 'Redondeado, 0 si el área no tiene pasos configurados.',
  })
  progressPercent: number;

  @Expose()
  @Type(() => FlashCardsProgressDoc)
  @ApiProperty({ type: FlashCardsProgressDoc })
  flashCards: FlashCardsProgressDoc;

  @Expose()
  @Type(() => SpeakingProgressDoc)
  @ApiProperty({ type: SpeakingProgressDoc })
  speaking: SpeakingProgressDoc;

  @Expose()
  @Type(() => ChatbotProgressDoc)
  @ApiProperty({ type: ChatbotProgressDoc })
  chatbot: ChatbotProgressDoc;

  @Expose()
  @Type(() => TestProgressDoc)
  @ApiProperty({ type: TestProgressDoc })
  test: TestProgressDoc;
}
