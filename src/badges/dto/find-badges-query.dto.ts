import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindBadgesQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description:
      'Id del área protegida. Requerido: el listado siempre es por área.',
  })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;
}
