import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  status: 'success';
  message: string;
  data: T;
}

/**
 * Envuelve toda respuesta exitosa en la estructura uniforme del proyecto:
 * { status: 'success', message: string, data: T }
 *
 * Los controllers pueden retornar { message, data } para personalizar el mensaje,
 * o retornar el dato directamente para usar el mensaje por defecto.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result: T) => {
        if (
          result &&
          typeof result === 'object' &&
          'message' in result &&
          'data' in result
        ) {
          return {
            status: 'success',
            message: (result as { message: string }).message,
            data: (result as { data: T }).data,
          };
        }

        return {
          status: 'success',
          message: 'Operación realizada correctamente.',
          data: result,
        };
      }),
    );
  }
}
