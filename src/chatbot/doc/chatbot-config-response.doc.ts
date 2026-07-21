import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ChatbotConfigResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  providerId: string;

  @Expose()
  @ApiProperty()
  model: string;

  @Expose()
  @ApiProperty()
  systemPrompt: string;

  @Expose()
  @ApiProperty()
  welcomeMessage: string;

  @Expose()
  @ApiProperty()
  temperature: number;

  @Expose()
  @ApiProperty()
  maxTokens: number;

  @Expose()
  @ApiProperty()
  isActive: boolean;
}
