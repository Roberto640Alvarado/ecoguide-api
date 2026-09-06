import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsOptionalBoolean } from '../../common/decorators/is-optional-boolean.decorator';

export class FindUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser STUDENT o TEACHER.' })
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filtra por cuenta activa/inactiva.' })
  @IsOptionalBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Fecha de registro mínima (inclusive), formato yyyy-MM-dd.',
  })
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de registro máxima (inclusive), formato yyyy-MM-dd.',
  })
  @IsOptional()
  createdTo?: string;
}
