import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindProtectedAreasQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtra por estado de publicación. Solo aplica para TEACHER; los STUDENT siempre ven únicamente las publicadas.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}
