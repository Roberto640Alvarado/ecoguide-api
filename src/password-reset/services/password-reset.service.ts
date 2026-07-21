import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../../users/services/users.service';
import { MailService } from '../../mail/services/mail.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';

const CODE_LENGTH = 6;

/**
 * Orquesta el flujo completo de recuperación de contraseña:
 * generar código → enviar correo → validar código → cambiar contraseña.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly expirationMinutes: number;

  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.expirationMinutes = Number(
      this.configService.get<string>('PASSWORD_RESET_EXPIRATION_MINUTES', '15'),
    );
  }

  /**
   * Solicita un código de recuperación. Siempre responde de forma genérica
   * (exista o no el correo) para no filtrar qué correos están registrados.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn(
        `Solicitud de recuperación para correo no registrado: ${email}`,
      );
      return;
    }

    await this.passwordResetRepository.invalidateActiveCodesForUser(user.id);

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.expirationMinutes * 60 * 1000);

    await this.passwordResetRepository.create(user.id, code, expiresAt);

    try {
      await this.mailService.sendPasswordResetCode(user.email, {
        name: user.name,
        code,
        expiresInMinutes: this.expirationMinutes,
      });
    } catch (error) {
      // No se debe filtrar al cliente si el envío de correo falló (rompería
      // la respuesta genérica de este endpoint y además delataría que el
      // correo sí está registrado). El código ya quedó creado en base de
      // datos; el error queda solo registrado para diagnóstico interno.
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${user.email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Valida el código y actualiza la contraseña del usuario asociado.
   */
  async resetPassword(code: string, newPassword: string): Promise<void> {
    const resetCode = await this.passwordResetRepository.findValidCode(code);

    if (!resetCode) {
      throw new BadRequestException('El código es inválido o ha expirado.');
    }

    await this.usersService.updatePassword(resetCode.userId, newPassword);
    await this.passwordResetRepository.markAsUsed(resetCode.id);
  }

  private generateCode(): string {
    const max = 10 ** CODE_LENGTH;
    const code = crypto.randomInt(0, max);

    return code.toString().padStart(CODE_LENGTH, '0');
  }
}
