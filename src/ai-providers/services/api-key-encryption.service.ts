import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_SALT = 'ecoguide-ai-providers-salt';
const IV_LENGTH = 12;

/**
 * Cifra/descifra las API keys de los proveedores de IA antes de persistirlas
 * (AIProvider.apiKeyEncrypted). Nunca se debe guardar ni devolver un apiKey
 * en texto plano por ningún endpoint.
 *
 * La clave simétrica se deriva (scrypt) de AI_PROVIDER_ENCRYPTION_KEY, una
 * variable de entorno que solo el equipo debe conocer.
 */
@Injectable()
export class ApiKeyEncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const secret = configService.getOrThrow<string>(
      'AI_PROVIDER_ENCRYPTION_KEY',
    );
    this.key = crypto.scryptSync(secret, KEY_SALT, 32);
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, dataHex] = payload.split(':');

    if (!ivHex || !authTagHex || !dataHex) {
      throw new Error('Formato de apiKeyEncrypted inválido.');
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
