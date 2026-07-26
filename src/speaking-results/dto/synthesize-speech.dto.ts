import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SynthesizeSpeechDto {
  @ApiProperty({
    description: 'Texto a convertir en audio (ej. un turno de la IA).',
  })
  @IsString()
  @IsNotEmpty({ message: 'El texto no puede estar vacío.' })
  @MaxLength(2000, {
    message: 'El texto no puede superar los 2000 caracteres.',
  })
  text: string;
}
