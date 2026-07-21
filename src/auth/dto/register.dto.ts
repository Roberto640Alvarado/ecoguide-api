import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

/**
 * Avatares predefinidos disponibles en el registro. Son rutas de assets
 * estáticos servidos por ecoguide-app (no archivos subidos) — cuando exista
 * el módulo UploadFiles, esta whitelist podrá reemplazarse por URLs reales
 * de Cloudflare R2 sin cambiar el shape del campo.
 */
export const AVATAR_OPTIONS = [
  '/avatars/avatar-boy.png',
  '/avatars/avatar-girl.png',
] as const;

export class RegisterDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido.' })
  name: string;

  @ApiProperty({ example: 'Martínez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido.' })
  lastName: string;

  @ApiProperty({ example: 'ana.martinez@example.com' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  email: string;

  @ApiProperty({ example: 'Estudiante123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(PASSWORD_REGEX, {
    message: 'La contraseña debe contener al menos una letra y un número.',
  })
  password: string;

  @ApiProperty({
    example: AVATAR_OPTIONS[0],
    required: false,
    enum: AVATAR_OPTIONS,
  })
  @IsOptional()
  @IsIn(AVATAR_OPTIONS, { message: 'El avatar seleccionado no es válido.' })
  avatarUrl?: string;
}
