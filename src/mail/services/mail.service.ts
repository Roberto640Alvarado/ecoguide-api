import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import {
  PasswordResetEmail,
  PasswordResetTemplateData,
} from '../templates/password-reset.template';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');

/**
 * Envío de correos vía SMTP de Gmail (nodemailer), usando una cuenta de
 * Gmail normal con una "Contraseña de aplicación" de 16 caracteres (requiere
 * Verificación en 2 pasos activada en la cuenta) — no la contraseña normal
 * de la cuenta.
 *
 * Configuración leída de variables de entorno: SMTP_HOST, SMTP_PORT,
 * SMTP_USER, SMTP_PASSWORD, MAIL_FROM, MAIL_REPLY_TO. `SMTP_HOST`/`SMTP_PORT`
 * tienen default para Gmail (smtp.gmail.com:587) para no repetirlos si no
 * hace falta.
 *
 * MailModule es @Global y se importa de forma eager en AppModule, así que
 * el transporte NO se construye en el constructor con `getOrThrow` (eso
 * tumbaría todo el backend al arrancar si las credenciales SMTP aún no
 * están configuradas) — se crea de forma perezosa la primera vez que se
 * necesita enviar un correo (mismo patrón que TranslationService con
 * DEEPL_API_KEY).
 *
 * ⚠️ Límite de Gmail: las cuentas gratuitas permiten hasta 500 correos por
 * día; superar ese límite bloquea la cuenta temporalmente.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly replyToAddress?: string;
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const mailFrom = this.configService.get<string>(
      'MAIL_FROM',
      'EcoGuide <ecoguidetraining@gmail.com>',
    );
    const { name, email } = parseFromAddress(mailFrom);
    this.senderName = name;
    this.senderEmail = email;
    this.replyToAddress = this.configService.get<string>('MAIL_REPLY_TO');
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');

    if (!user || !password) {
      throw new InternalServerErrorException(
        'El servicio de correo no está configurado todavía.',
      );
    }

    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });

    return this.transporter;
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
      await this.getTransporter().sendMail({
        from: `"${this.senderName}" <${this.senderEmail}>`,
        to,
        ...(this.replyToAddress && { replyTo: this.replyToAddress }),
        subject: 'Recuperación de contraseña - EcoGuide',
        html,
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
 * Convierte "Nombre <correo@dominio.com>" (formato de MAIL_FROM) al par
 * {name, email} que espera el header `from` de nodemailer. Si MAIL_FROM es
 * solo un correo sin nombre, se usa "EcoGuide" por defecto.
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
