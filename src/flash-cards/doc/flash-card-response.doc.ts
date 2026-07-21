import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { FlashCardType } from '@prisma/client';

/**
 * Representación pública de una flashcard.
 * Usar con plainToInstance antes de responder.
 */
@Exclude()
export class FlashCardResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty({ enum: FlashCardType })
  type: FlashCardType;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  content: string;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  image: string | null;

  @Expose()
  @ApiProperty()
  order: number;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  question: string | null;

  @Expose()
  @ApiProperty({ type: [String] })
  options: string[];

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  correctAnswer: string | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
