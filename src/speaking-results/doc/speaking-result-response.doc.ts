import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Representación pública de un intento de speaking del estudiante. Incluye
 * la retroalimentación y calificación generadas por IA a partir del prompt
 * de evaluación configurado por el docente (SpeakingPractice.prompt).
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
  @ApiProperty()
  audioUrl: string;

  @Expose()
  @ApiProperty()
  transcription: string;

  @Expose()
  @ApiProperty()
  feedback: string;

  @Expose()
  @ApiProperty({ description: 'Calificación del 1 al 10.' })
  score: number;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
