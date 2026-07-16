import { Global, Module } from '@nestjs/common';
import { MailService } from './services/mail.service';

/**
 * Módulo global de envío de correos. Se marca @Global porque es infraestructura
 * compartida (igual que PrismaModule), consumida por PasswordResetModule y
 * potencialmente por otros módulos (notificaciones, etc.).
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
