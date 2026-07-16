import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ApiErrorResponse {
  status: 'error';
  message: string;
}

/**
 * Captura toda excepción (HttpException o error inesperado) y responde con
 * la estructura uniforme de error del proyecto: { status: 'error', message }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const httpStatus = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception, isHttpException);

    if (!isHttpException) {
      this.logger.error(
        `Error no controlado: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = {
      status: 'error',
      message,
    };

    response.status(httpStatus).json(body);
  }

  private extractMessage(exception: unknown, isHttpException: boolean): string {
    if (isHttpException) {
      const response = (exception as HttpException).getResponse();

      if (typeof response === 'string') {
        return response;
      }

      const messageField = (response as { message?: string | string[] })
        .message;

      if (Array.isArray(messageField)) {
        return messageField.join(' ');
      }

      if (typeof messageField === 'string') {
        return messageField;
      }
    }

    return 'Ha ocurrido un error inesperado.';
  }
}
