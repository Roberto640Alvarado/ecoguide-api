import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana.martinez@example.com' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  email: string;
}
