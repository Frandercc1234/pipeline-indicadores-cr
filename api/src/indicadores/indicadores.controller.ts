import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { CacheDatos } from '../comun/cache-datos.interceptor';
import { ErrorDto } from '../comun/error.dto';
import { SlugParamDto, SerieQueryDto } from './dto/consultas.dto';
import { IndicadorDto, SerieDto } from './dto/indicador.dto';
import { IndicadoresService } from './indicadores.service';

@ApiTags('Indicadores')
@UseInterceptors(CacheDatos)
@ApiTooManyRequestsResponse({
  type: ErrorDto,
  description: 'Más de 60 peticiones por minuto desde la misma IP',
})
@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly servicio: IndicadoresService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los indicadores con su último valor',
    description:
      'Solo los indicadores activos, ordenados por id. `ultimo` y `anterior` son null si todavía no hay datos.',
  })
  @ApiOkResponse({ type: [IndicadorDto] })
  listar(): Promise<IndicadorDto[]> {
    return this.servicio.listar();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalle de un indicador' })
  @ApiOkResponse({
    type: IndicadorDto,
    example: {
      slug: 'tc_venta',
      codigoBccr: 318,
      nombre: 'Tipo de cambio de referencia, venta',
      unidad: 'colones por dólar',
      periodicidad: 'diaria',
      ultimo: { fecha: '2026-11-16', valor: 448.34 },
      anterior: { fecha: '2026-11-15', valor: 448.34 },
    },
  })
  @ApiBadRequestResponse({ type: ErrorDto, description: 'Slug inválido' })
  @ApiNotFoundResponse({
    type: ErrorDto,
    description: 'El indicador no existe',
  })
  obtener(@Param() { slug }: SlugParamDto): Promise<IndicadorDto> {
    return this.servicio.obtener(slug);
  }

  @Get(':slug/serie')
  @ApiOperation({
    summary: 'Serie histórica de un indicador',
    description:
      'Observaciones entre `desde` y `hasta` (ambas incluidas), ordenadas por fecha ascendente. ' +
      'Por defecto, desde 2015-01-01 hasta hoy (hora de Costa Rica).',
  })
  @ApiOkResponse({
    type: SerieDto,
    example: {
      slug: 'tc_venta',
      nombre: 'Tipo de cambio de referencia, venta',
      unidad: 'colones por dólar',
      desde: '2026-11-14',
      hasta: '2026-11-16',
      datos: [
        { fecha: '2026-11-14', valor: 448.34 },
        { fecha: '2026-11-15', valor: 448.34 },
        { fecha: '2026-11-16', valor: 448.34 },
      ],
    },
  })
  @ApiBadRequestResponse({
    type: ErrorDto,
    description:
      'Slug o fechas inválidas, desde posterior a hasta, o desde anterior a 2015-01-01',
  })
  @ApiNotFoundResponse({
    type: ErrorDto,
    description: 'El indicador no existe',
  })
  serie(
    @Param() { slug }: SlugParamDto,
    @Query() { desde, hasta }: SerieQueryDto,
  ): Promise<SerieDto> {
    return this.servicio.serie(slug, desde, hasta);
  }
}
