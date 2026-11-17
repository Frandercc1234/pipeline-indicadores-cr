import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import type { Config } from '../config/config';
import { FiltroErrores } from './filtro-errores';

/** Configuración común de la app: la usan main.ts y las pruebas e2e. */
export function configurarApp(
  app: NestExpressApplication,
  config: Config,
): void {
  // Detrás del balanceador de Render, la IP real viene en X-Forwarded-For.
  app.set('trust proxy', 1);
  app.enableCors({ origin: config.corsOrigenes, methods: ['GET'] });
  app.use((_req: Request, res: Response, siguiente: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    siguiente();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new FiltroErrores());

  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API de indicadores económicos de Costa Rica')
      .setDescription(
        'Indicadores del Banco Central de Costa Rica (BCCR) con historial desde 2015. ' +
          'Solo lectura. Límite: 60 peticiones por minuto por IP. ' +
          'Fuente: https://sdd.bccr.fi.cr',
      )
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, documento);
}
