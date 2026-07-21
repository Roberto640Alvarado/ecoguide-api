import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Mensaje del estudiante para el chatbot.' })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío.' })
  @MaxLength(2000, {
    message: 'El mensaje no puede superar los 2000 caracteres.',
  })
  message: string;
}
