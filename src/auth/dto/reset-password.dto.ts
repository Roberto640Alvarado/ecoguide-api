import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

export class ResetPasswordDto {
  @ApiProperty({
    example: '482913',
    description: 'Código de 6 dígitos enviado por correo.',
  })
  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos.' })
  code: string;

  @ApiProperty({ example: 'NuevaClave123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(PASSWORD_REGEX, {
    message: 'La contraseña debe contener al menos una letra y un número.',
  })
  newPassword: string;
}
