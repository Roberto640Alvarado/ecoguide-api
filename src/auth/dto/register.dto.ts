import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

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
}
