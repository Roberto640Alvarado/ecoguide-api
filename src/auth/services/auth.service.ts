import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { UsersService } from '../../users/services/users.service';
import { PasswordResetService } from '../../password-reset/services/password-reset.service';
import { UserResponseDoc } from '../../users/doc/user-response.doc';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDoc } from '../doc/auth-response.doc';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordResetService: PasswordResetService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDoc> {
    const user = await this.usersService.create({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      role: UserRole.STUDENT,
    });

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async login(dto: LoginDto): Promise<AuthResponseDoc> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Esta cuenta se encuentra desactivada.');
    }

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async getProfile(userId: string): Promise<UserResponseDoc> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    return plainToInstance(UserResponseDoc, user, {
      excludeExtraneousValues: true,
    });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.passwordResetService.requestReset(email);
  }

  async resetPassword(code: string, newPassword: string): Promise<void> {
    await this.passwordResetService.resetPassword(code, newPassword);
  }

  private async buildAuthResponse(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<AuthResponseDoc> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);
    const user = await this.usersService.findById(userId);

    return {
      accessToken,
      user: plainToInstance(UserResponseDoc, user, {
        excludeExtraneousValues: true,
      }),
    };
  }
}
