import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateModelDto } from './create-model.dto';

export class CreateAIProviderDto {
  @ApiProperty({ example: 'Google Gemini' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proveedor es requerido.' })
  providerName: string;

  @ApiProperty({
    description:
      'API key en texto plano. Se cifra antes de guardarse y nunca se devuelve.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El apiKey es requerido.' })
  apiKey: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [CreateModelDto],
    description: 'Modelos iniciales del proveedor (opcional).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModelDto)
  models?: CreateModelDto[];
}
