import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class StartConversationDto {
  @ApiProperty({ description: 'Id del área protegida a conversar.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;
}
