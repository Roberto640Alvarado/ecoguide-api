import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { BrevoClient } from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';
import {
  PasswordResetEmail,
  PasswordResetTemplateData,
} from '../templates/password-reset.template';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');

/**
 * Envío de correos vía Brevo (API HTTP, SDK oficial @getbrevo/brevo).
 * Configuración leída de variables de entorno (BREVO_API_KEY, MAIL_FROM,
 * MAIL_REPLY_TO).
 *
 * El correo de MAIL_FROM debe estar verificado como "sender" en Brevo
 * (Senders, Domains & Dedicated IPs -> Senders -> Add a sender), lo cual
 * solo requiere confirmar un código de 6 dígitos enviado a esa dirección
 * (no requiere verificar un dominio propio por DNS). Una vez verificado,
 * se puede enviar a cualquier destinatario sin restricciones, a diferencia
 * del modo sandbox de Mailgun/Resend.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: BrevoClient;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly replyToAddress?: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new BrevoClient({
      apiKey: this.configService.getOrThrow<string>('BREVO_API_KEY'),
    });

    const mailFrom = this.configService.get<string>(
      'MAIL_FROM',
      'EcoGuide <ecoguidetraining@gmail.com>',
    );
    const { name, email } = parseFromAddress(mailFrom);
    this.senderName = name;
    this.senderEmail = email;
    this.replyToAddress = this.configService.get<string>('MAIL_REPLY_TO');
  }

  async sendPasswordResetCode(
    to: string,
    data: PasswordResetTemplateData,
  ): Promise<void> {
    const logoSrc = fs.existsSync(LOGO_PATH)
      ? `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`
      : undefined;
    const html = await render(PasswordResetEmail({ ...data, logoSrc }));

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        ...(this.replyToAddress && {
          replyTo: { email: this.replyToAddress },
        }),
        subject: 'Recuperación de contraseña - EcoGuide',
        htmlContent: html,
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

/**
 * Convierte "Nombre <correo@dominio.com>" (formato usado por Nodemailer/
 * SMTP en MAIL_FROM) al par {name, email} que espera el `sender` de Brevo.
 * Si MAIL_FROM es solo un correo sin nombre, se usa "EcoGuide" por defecto.
 */
function parseFromAddress(mailFrom: string): { name: string; email: string } {
  const match = /^(.*?)<(.+)>$/.exec(mailFrom.trim());

  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, '') || 'EcoGuide',
      email: match[2].trim(),
    };
  }

  return { name: 'EcoGuide', email: mailFrom.trim() };
}
