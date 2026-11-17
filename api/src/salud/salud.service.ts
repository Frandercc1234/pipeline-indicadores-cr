import { Injectable, Logger } from '@nestjs/common';
import { SaludRepository, type UltimaCarga } from './salud.repository';

export const HORAS_MAXIMAS_SIN_CARGA = 36;

export interface EstadoSalud {
  estado: 'ok' | 'degradado';
  base: 'ok' | 'error';
  ultimaCarga: { tipo: string; fin: string; estado: string } | null;
  horasDesdeUltimaCarga: number | null;
}

@Injectable()
export class SaludService {
  private readonly logger = new Logger(SaludService.name);

  constructor(private readonly repositorio: SaludRepository) {}

  /** `estado` es degradado si la base no responde o la última carga diaria es muy vieja. */
  async comprobar(ahora: Date = new Date()): Promise<EstadoSalud> {
    let carga: UltimaCarga | undefined;
    try {
      carga = await this.repositorio.ultimaCargaDiariaOk();
    } catch (error) {
      this.logger.warn(
        `La base no respondió: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return {
        estado: 'degradado',
        base: 'error',
        ultimaCarga: null,
        horasDesdeUltimaCarga: null,
      };
    }
    if (!carga) {
      return {
        estado: 'degradado',
        base: 'ok',
        ultimaCarga: null,
        horasDesdeUltimaCarga: null,
      };
    }
    const horas = (ahora.getTime() - carga.fin.getTime()) / 3_600_000;
    return {
      estado: horas > HORAS_MAXIMAS_SIN_CARGA ? 'degradado' : 'ok',
      base: 'ok',
      ultimaCarga: {
        tipo: carga.tipo,
        fin: carga.fin.toISOString(),
        estado: carga.estado,
      },
      horasDesdeUltimaCarga: Math.round(horas * 10) / 10,
    };
  }
}
