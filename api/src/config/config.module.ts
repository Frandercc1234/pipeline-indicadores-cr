import { Global, Module } from '@nestjs/common';
import { CONFIG, leerConfig } from './config';

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => leerConfig() }],
  exports: [CONFIG],
})
export class ConfigModule {}
