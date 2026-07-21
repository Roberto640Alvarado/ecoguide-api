import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO base para cualquier endpoint de listado. Todo módulo que devuelva
 * listas debe soportar page, limit, search y sort (ver CLAUDE.md).
 * Extender esta clase para agregar filtros propios de cada módulo.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Búsqueda por texto libre.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Formato "campo:asc" o "campo:desc".',
    example: 'createdAt:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
