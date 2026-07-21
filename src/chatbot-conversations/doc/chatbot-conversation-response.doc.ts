import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { MessageResponseDoc } from './message-response.doc';

/**
 * Representación pública de una conversación del estudiante con el chatbot
 * de un área. `feedback` solo se llena al finalizar (PATCH .../finish); antes
 * de eso viaja como null.
 */
@Exclude()
export class ChatbotConversationResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @Type(() => MessageResponseDoc)
  @ApiProperty({ type: [MessageResponseDoc] })
  messages: MessageResponseDoc[];

  @Expose()
  @ApiProperty()
  startedAt: Date;

  @Expose()
  @ApiProperty({ nullable: true })
  endedAt: Date | null;

  @Expose()
  @ApiProperty({ nullable: true })
  feedback: string | null;
}
