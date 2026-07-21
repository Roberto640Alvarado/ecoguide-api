import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AVATAR_OPTIONS } from '../../common/constants/avatar-options.constant';

/**
 * Auto-edición de perfil (PATCH /auth/me): a diferencia de UpdateUserDto
 * (panel TEACHER, edita a OTROS usuarios), este DTO nunca incluye `email`
 * — el estudiante/maestro no puede cambiar su propio correo desde esta
 * vista — ni `role`/`isActive`, que solo el docente administra. El cambio
 * de contraseña sigue yendo siempre por el flujo de recuperación.
 */
export class UpdateProfileDto {
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

  @ApiPropertyOptional({
    example: AVATAR_OPTIONS[0],
    enum: AVATAR_OPTIONS,
  })
  @IsOptional()
  @IsIn(AVATAR_OPTIONS, { message: 'El avatar seleccionado no es válido.' })
  avatarUrl?: string;
}
