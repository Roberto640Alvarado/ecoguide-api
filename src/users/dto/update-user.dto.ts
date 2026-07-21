import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

/**
 * No incluye password: los cambios de contraseña van siempre por el flujo
 * de recuperación (POST /auth/forgot-password + /auth/reset-password),
 * nunca por una edición directa de perfil.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  name?: string;

  @ApiPropertyOptional({ example: 'Martínez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El apellido no puede estar vacío.' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'ana.martinez@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido.' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ecoguide.com/avatars/ana.png' })
  @IsOptional()
  @IsUrl({}, { message: 'El avatar debe ser una URL válida.' })
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser STUDENT o TEACHER.' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
