import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { SubmitAnswerDto } from './submit-answer.dto';

export class SubmitTestDto {
  @ApiProperty({ description: 'Id del área protegida cuyo examen se envía.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({
    type: [SubmitAnswerDto],
    description: 'Respuestas del estudiante.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes responder al menos 1 pregunta.' })
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}
