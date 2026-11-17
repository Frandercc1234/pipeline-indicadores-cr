import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configurarApp } from './comun/configurar-app';
import { leerConfig } from './config/config';

async function bootstrap() {
  const config = leerConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configurarApp(app, config);
  app.enableShutdownHooks();
  await app.listen(config.port, '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Error al arrancar');
  process.exit(1);
});
