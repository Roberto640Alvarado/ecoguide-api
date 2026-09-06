import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsOptionalBoolean } from '../../common/decorators/is-optional-boolean.decorator';

export class FindProtectedAreasQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtra por estado de publicación. Solo aplica para TEACHER; los STUDENT siempre ven únicamente las publicadas.',
  })
  @IsOptionalBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Fecha de creación mínima (inclusive), formato yyyy-MM-dd.',
  })
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de creación máxima (inclusive), formato yyyy-MM-dd.',
  })
  @IsOptional()
  createdTo?: string;
}
