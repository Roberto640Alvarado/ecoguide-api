import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import {
  PasswordResetEmail,
  PasswordResetTemplateData,
} from '../templates/password-reset.template';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');
const LOGO_CONTENT_ID = 'logo';

/**
 * Envío de correos vía SMTP (Nodemailer). Configuración leída de variables
 * de entorno (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
 * MAIL_FROM, MAIL_REPLY_TO).
 *
 * Por defecto apunta a Gmail (smtp.gmail.com:587), gratuito y sin el límite
 * de "solo se puede enviar al dueño de la cuenta" que tienen proveedores
 * como Resend en modo sandbox sin dominio verificado. SMTP_USER debe ser la
 * cuenta de Gmail y SMTP_PASS una "Contraseña de aplicación" (Google Account
 * -> Seguridad -> Verificación en dos pasos -> Contraseñas de aplicaciones) -
 * nunca la contraseña normal de la cuenta, que Google rechaza para SMTP.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly replyToAddress?: string;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASS'),
      },
    });

    this.fromAddress = this.configService.get<string>(
      'MAIL_FROM',
      'EcoGuide <ecoguidetraining@gmail.com>',
    );
    this.replyToAddress = this.configService.get<string>('MAIL_REPLY_TO');
  }

  async sendPasswordResetCode(
    to: string,
    data: PasswordResetTemplateData,
  ): Promise<void> {
    const html = await render(PasswordResetEmail(data));
    const hasLogo = fs.existsSync(LOGO_PATH);

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        replyTo: this.replyToAddress,
        subject: 'Recuperación de contraseña - EcoGuide',
        html,
        attachments: hasLogo
          ? [
              {
                filename: 'logo.png',
                path: LOGO_PATH,
                cid: LOGO_CONTENT_ID,
              },
            ]
          : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${to}: ${message}`,
      );
      throw error instanceof Error ? error : new Error(message);
    }
  }
}
