import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { SpeakingTurnResponseDoc } from './speaking-turn-response.doc';

/**
 * Representación pública de una llamada de práctica de speaking del
 * estudiante (multi-turno, ver ChatbotConversationResponseDoc — mismo
 * patrón). `feedback`/`score` solo se llenan al finalizar (PATCH
 * .../finish); antes de eso viajan como null.
 */
@Exclude()
export class SpeakingResultResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  speakingPracticeId: string;

  @Expose()
  @Type(() => SpeakingTurnResponseDoc)
  @ApiProperty({ type: [SpeakingTurnResponseDoc] })
  turns: SpeakingTurnResponseDoc[];

  @Expose()
  @ApiProperty()
  startedAt: Date;

  @Expose()
  @ApiProperty({ nullable: true })
  endedAt: Date | null;

  @Expose()
  @ApiProperty({ nullable: true })
  feedback: string | null;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Calificación del 1 al 10.' })
  score: number | null;
}
