import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';

export const CACHE_DATOS = 'public, max-age=3600';

/**
 * Pone Cache-Control solo cuando el handler responde bien.
 * Un @Header se escribe antes de ejecutar el handler y por eso también quedaría en los
 * errores; las respuestas 4xx y 5xx llevan no-store (lo pone el filtro de errores).
 */
@Injectable()
export class CacheDatos implements NestInterceptor {
  intercept(
    contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Observable<unknown> {
    return siguiente.handle().pipe(
      tap(() => {
        contexto
          .switchToHttp()
          .getResponse<Response>()
          .setHeader('Cache-Control', CACHE_DATOS);
      }),
    );
  }
}
