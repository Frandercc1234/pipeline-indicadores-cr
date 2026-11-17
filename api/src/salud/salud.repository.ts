import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';

export interface UltimaCarga {
  tipo: string;
  fin: Date;
  estado: string;
}

@Injectable()
export class SaludRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Última carga diaria terminada en estado ok, o undefined si no hay ninguna. */
  async ultimaCargaDiariaOk(): Promise<UltimaCarga | undefined> {
    const { rows } = await this.pool.query<UltimaCarga>(
      `SELECT tipo, fin, estado FROM carga
       WHERE tipo = 'diaria' AND estado = 'ok' AND fin IS NOT NULL
       ORDER BY fin DESC LIMIT 1`,
    );
    return rows[0];
  }
}
