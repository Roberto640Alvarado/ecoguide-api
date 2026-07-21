import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';

/**
 * Configuración de pino para nestjs-pino.
 * - En desarrollo: salida legible en consola (pino-pretty).
 * - En producción: JSON estructurado, listo para cualquier agregador de logs
 *   (Better Stack/Logtail, Datadog, CloudWatch, etc.) sin configuración extra.
 */
export function buildLoggerConfig(configService: ConfigService): Params {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    pinoHttp: {
      level: isProduction ? 'info' : 'debug',
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
      autoLogging: true,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      customProps: () => ({ context: 'HTTP' }),
    },
  };
}
