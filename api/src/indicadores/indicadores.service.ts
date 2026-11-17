import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hoyCostaRica } from '../comun/fechas';
import { IndicadorDto, ObservacionDto, SerieDto } from './dto/indicador.dto';
import {
  type FilaIndicador,
  IndicadoresRepository,
} from './indicadores.repository';

export const FECHA_MINIMA = '2015-01-01';

function observacion(
  fecha: string | null,
  valor: string | null,
): ObservacionDto | null {
  if (fecha === null || valor === null) return null;
  return { fecha, valor: Number(valor) };
}

function aIndicador(fila: FilaIndicador): IndicadorDto {
  return {
    slug: fila.slug,
    codigoBccr: fila.codigo_bccr,
    nombre: fila.nombre,
    unidad: fila.unidad,
    periodicidad: fila.periodicidad,
    ultimo: observacion(fila.ultimo_fecha, fila.ultimo_valor),
    anterior: observacion(fila.anterior_fecha, fila.anterior_valor),
  };
}

@Injectable()
export class IndicadoresService {
  constructor(private readonly repositorio: IndicadoresRepository) {}

  async listar(): Promise<IndicadorDto[]> {
    return (await this.repositorio.listar()).map(aIndicador);
  }

  async obtener(slug: string): Promise<IndicadorDto> {
    return aIndicador(await this.buscar(slug));
  }

  /**
   * Si no viene `hasta`, la serie llega hasta la última fecha disponible del indicador
   * (la misma que `ultimo` en /indicadores), aunque sea posterior a hoy.
   */
  async serie(
    slug: string,
    desde: string = FECHA_MINIMA,
    hastaPedida?: string,
  ): Promise<SerieDto> {
    if (desde < FECHA_MINIMA) {
      throw new BadRequestException(
        `desde no puede ser anterior a ${FECHA_MINIMA}`,
      );
    }
    if (hastaPedida !== undefined && desde > hastaPedida) {
      throw new BadRequestException('desde no puede ser posterior a hasta');
    }
    const fila = await this.buscar(slug);
    const ultima = fila.ultimo_fecha ?? hoyCostaRica();
    // Un desde posterior a la última fecha no es un error: la serie sale vacía.
    const hasta = hastaPedida ?? (ultima < desde ? desde : ultima);
    const datos = await this.repositorio.serie(fila.id, desde, hasta);
    return {
      slug: fila.slug,
      nombre: fila.nombre,
      unidad: fila.unidad,
      desde,
      hasta,
      datos: datos.map((d) => ({ fecha: d.fecha, valor: Number(d.valor) })),
    };
  }

  private async buscar(slug: string): Promise<FilaIndicador> {
    const fila = await this.repositorio.buscarPorSlug(slug);
    if (!fila) {
      throw new NotFoundException(`No existe el indicador '${slug}'`);
    }
    return fila;
  }
}
