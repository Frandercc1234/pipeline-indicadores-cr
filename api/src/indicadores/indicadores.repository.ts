import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';

/** Fila de un indicador con sus dos últimas observaciones. `valor` llega como texto (numeric). */
export interface FilaIndicador {
  id: number;
  slug: string;
  codigo_bccr: number;
  nombre: string;
  unidad: string;
  periodicidad: string;
  ultimo_fecha: string | null;
  ultimo_valor: string | null;
  anterior_fecha: string | null;
  anterior_valor: string | null;
}

export interface FilaObservacion {
  fecha: string;
  valor: string;
}

const SQL_INDICADORES = `
  SELECT i.id, i.slug, i.codigo_bccr, i.nombre, i.unidad, i.periodicidad,
         to_char(u.fecha, 'YYYY-MM-DD') AS ultimo_fecha, u.valor AS ultimo_valor,
         to_char(a.fecha, 'YYYY-MM-DD') AS anterior_fecha, a.valor AS anterior_valor
  FROM indicador i
  LEFT JOIN LATERAL (
    SELECT fecha, valor FROM observacion
    WHERE indicador_id = i.id ORDER BY fecha DESC LIMIT 1
  ) u ON true
  LEFT JOIN LATERAL (
    SELECT fecha, valor FROM observacion
    WHERE indicador_id = i.id ORDER BY fecha DESC LIMIT 1 OFFSET 1
  ) a ON true
  WHERE i.activo AND ($1::text IS NULL OR i.slug = $1::text)
  ORDER BY i.id
`;

const SQL_SERIE = `
  SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, valor
  FROM observacion
  WHERE indicador_id = $1 AND fecha BETWEEN $2::date AND $3::date
  ORDER BY fecha
`;

@Injectable()
export class IndicadoresRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listar(): Promise<FilaIndicador[]> {
    const { rows } = await this.pool.query<FilaIndicador>(SQL_INDICADORES, [
      null,
    ]);
    return rows;
  }

  async buscarPorSlug(slug: string): Promise<FilaIndicador | undefined> {
    const { rows } = await this.pool.query<FilaIndicador>(SQL_INDICADORES, [
      slug,
    ]);
    return rows[0];
  }

  async serie(
    indicadorId: number,
    desde: string,
    hasta: string,
  ): Promise<FilaObservacion[]> {
    const { rows } = await this.pool.query<FilaObservacion>(SQL_SERIE, [
      indicadorId,
      desde,
      hasta,
    ]);
    return rows;
  }
}
