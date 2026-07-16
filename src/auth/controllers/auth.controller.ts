import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../common/decorators/user.decorator';
import { UserResponseDoc } from '../../users/doc/user-response.doc';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AuthResponseDoc } from '../doc/auth-response.doc';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un nuevo estudiante.' })
  @ApiResponse({ status: 201, description: 'Cuenta creada correctamente.' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado.' })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ message: string; data: AuthResponseDoc }> {
    const data = await this.authService.register(dto);

    return { message: 'Cuenta creada correctamente.', data };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión con correo y contraseña.' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ message: string; data: AuthResponseDoc }> {
    const data = await this.authService.login(dto);

    return { message: 'Inicio de sesión exitoso.', data };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retorna la información del usuario dueño del token.',
  })
  @ApiResponse({ status: 200, description: 'Información del usuario.' })
  @ApiResponse({
    status: 401,
    description: 'Token inválido, expirado o no proporcionado.',
  })
  async getProfile(
    @User('id') userId: string,
  ): Promise<{ message: string; data: UserResponseDoc }> {
    const data = await this.authService.getProfile(userId);

    return { message: 'Usuario obtenido correctamente.', data };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicita un código de recuperación de contraseña por correo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Si el correo existe, se envió un código.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string; data: null }> {
    await this.authService.forgotPassword(dto.email);

    return {
      message:
        'Si el correo está registrado, recibirás un código de recuperación.',
      data: null,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Valida el código recibido y define una nueva contraseña.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente.',
  })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado.' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string; data: null }> {
    await this.authService.resetPassword(dto.code, dto.newPassword);

    return { message: 'Contraseña actualizada correctamente.', data: null };
  }
}
