import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateModelDto {
  @ApiProperty({ example: 'Gemini 1.5 Flash' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del modelo es requerido.' })
  name: string;

  @ApiProperty({
    example: 'gemini-1.5-flash',
    description: 'Identificador real del modelo enviado al proveedor.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El identificador del modelo es requerido.' })
  model: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
