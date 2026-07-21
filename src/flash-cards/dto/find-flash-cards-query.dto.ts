import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlashCardType } from '@prisma/client';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindFlashCardsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description:
      'Id del área protegida. Requerido: el listado siempre es por área.',
  })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiPropertyOptional({ enum: FlashCardType })
  @IsOptional()
  @IsEnum(FlashCardType, { message: 'El tipo de flashcard no es válido.' })
  type?: FlashCardType;
}
