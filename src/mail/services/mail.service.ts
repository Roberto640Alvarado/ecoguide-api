import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildPasswordResetTemplate,
  PasswordResetTemplateData,
} from '../templates/password-reset.template';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');

/**
 * Envío de correos vía SMTP (nodemailer). Configuración leída de variables
 * de entorno (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD).
 * Compatible con cualquier proveedor SMTP gratuito (Gmail, Brevo, Mailtrap, etc.).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });

    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.get<string>('SMTP_USER', 'no-reply@ecoguide.com');
  }

  async sendPasswordResetCode(
    to: string,
    data: PasswordResetTemplateData,
  ): Promise<void> {
    const html = buildPasswordResetTemplate(data);
    const hasLogo = fs.existsSync(LOGO_PATH);

    try {
      await this.transporter.sendMail({
        from: `"EcoGuide" <${this.fromAddress}>`,
        to,
        subject: 'Recuperación de contraseña - EcoGuide',
        html,
        attachments: hasLogo
          ? [
              {
                filename: 'logo.png',
                path: LOGO_PATH,
                cid: 'logo',
              },
            ]
          : [],
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
