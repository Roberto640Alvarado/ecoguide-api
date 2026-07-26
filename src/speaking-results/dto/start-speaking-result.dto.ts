import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class StartSpeakingResultDto {
  @ApiProperty({ description: 'Id del área protegida a practicar.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;
}
