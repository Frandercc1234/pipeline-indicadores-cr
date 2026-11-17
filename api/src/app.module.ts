import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CONFIG, type Config } from './config/config';
import { ConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { IndicadoresModule } from './indicadores/indicadores.module';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    ThrottlerModule.forRootAsync({
      inject: [CONFIG],
      useFactory: (config: Config) => [
        { ttl: config.throttleTtlMs, limit: config.throttleLimit },
      ],
    }),
    IndicadoresModule,
    SaludModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
