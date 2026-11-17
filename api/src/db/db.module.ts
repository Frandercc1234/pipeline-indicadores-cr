import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CONFIG, type Config } from '../config/config';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [CONFIG],
      useFactory: (config: Config) => {
        const pool = new Pool({
          connectionString: config.databaseUrl,
          max: 5,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 30_000,
        });
        // Neon suspende el compute: una conexión ociosa puede caerse sin que sea un fallo.
        pool.on('error', (error) => {
          new Logger('Pool').warn(`Conexión ociosa cerrada: ${error.message}`);
        });
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
