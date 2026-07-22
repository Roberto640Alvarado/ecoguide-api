import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateBadgeDto {
  @ApiProperty({ description: 'Id del área protegida a la que pertenece.' })
  @IsMongoId({ message: 'El protectedAreaId no es un id válido.' })
  protectedAreaId: string;

  @ApiProperty({ example: 'Guardián del bosque nuboso' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido.' })
  name: string;

  @ApiProperty({
    example: 'Se otorga al completar todas las actividades del área.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida.' })
  description: string;

  @ApiProperty({
    example: '¡Felicidades! Ya eres un guardián del bosque nuboso.',
    description: 'Mensaje que verá el estudiante al obtener la insignia.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje para el estudiante es requerido.' })
  message: string;

  @ApiProperty({ description: 'URL de la imagen PNG de la insignia.' })
  @IsUrl({}, { message: 'La imagen debe ser una URL válida.' })
  imageUrl: string;
}
