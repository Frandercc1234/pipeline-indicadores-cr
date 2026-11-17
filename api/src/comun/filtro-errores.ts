import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const NOMBRES: Record<number, string> = {
  400: 'Solicitud inválida',
  404: 'No encontrado',
  429: 'Demasiadas peticiones',
  500: 'Error interno',
  503: 'Servicio no disponible',
};

function mensajeDe(excepcion: HttpException): string {
  const estado = excepcion.getStatus();
  if (estado === 429) {
    return 'Superaste el límite de peticiones. Intentá de nuevo en un minuto.';
  }
  const cuerpo = excepcion.getResponse();
  const mensaje =
    typeof cuerpo === 'string'
      ? cuerpo
      : (cuerpo as { message?: string | string[] }).message;
  const texto = Array.isArray(mensaje)
    ? mensaje.join('; ')
    : (mensaje ?? excepcion.message);
  if (estado === 404 && /^Cannot [A-Z]+ /.test(texto)) {
    return 'La ruta no existe';
  }
  return texto;
}

/** Devuelve siempre { statusCode, error, mensaje } y nunca un stack trace. */
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger(FiltroErrores.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    // Ningún error se cachea. Pisa el Cache-Control que haya puesto la ruta.
    respuesta.setHeader('Cache-Control', 'no-store');
    if (excepcion instanceof HttpException) {
      const estado = excepcion.getStatus();
      respuesta.status(estado).json({
        statusCode: estado,
        error: NOMBRES[estado] ?? 'Error',
        mensaje: mensajeDe(excepcion),
      });
      return;
    }
    this.logger.error(
      excepcion instanceof Error ? excepcion.message : 'Error desconocido',
    );
    respuesta.status(500).json({
      statusCode: 500,
      error: NOMBRES[500],
      mensaje: 'Ocurrió un error inesperado',
    });
  }
}
