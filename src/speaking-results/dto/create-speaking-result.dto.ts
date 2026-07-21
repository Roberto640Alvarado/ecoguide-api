import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateSpeakingResultDto {
  @ApiProperty({ description: 'Id del área protegida practicada.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({
    description:
      'URL del audio grabado por el estudiante (subido previamente vía POST /upload-files/audio).',
  })
  @IsUrl({}, { message: 'El audioUrl debe ser una URL válida.' })
  audioUrl: string;

  @ApiProperty({
    description:
      'Transcripción del audio, generada en el navegador (Web Speech API) antes de enviarla.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La transcripción es requerida.' })
  @MaxLength(5000, {
    message: 'La transcripción no puede superar los 5000 caracteres.',
  })
  transcription: string;
}
