import { Controller, Get, Header, Inject, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CONFIG, type Config } from '../config/config';
import { type EstadoSalud, SaludService } from './salud.service';

@ApiTags('Salud')
@Controller('salud')
export class SaludController {
  constructor(
    private readonly servicio: SaludService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Estado de la API y de la base',
    description:
      'Responde 503 con estado "degradado" si la base no responde o si la última carga diaria exitosa tiene más de 36 horas.',
  })
  @ApiOkResponse({
    example: {
      estado: 'ok',
      base: 'ok',
      ultimaCarga: {
        tipo: 'diaria',
        fin: '2026-11-16T12:16:04.000Z',
        estado: 'ok',
      },
      horasDesdeUltimaCarga: 5.2,
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio degradado',
    example: {
      estado: 'degradado',
      base: 'error',
      ultimaCarga: null,
      horasDesdeUltimaCarga: null,
    },
  })
  async salud(
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<EstadoSalud> {
    // La salud nunca se cachea, ni el 200 ni el 503.
    respuesta.setHeader('Cache-Control', 'no-store');
    const estado = await this.servicio.comprobar();
    if (estado.estado === 'degradado') respuesta.status(503);
    return estado;
  }

  @Get('vivo')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'La API está viva',
    description:
      'No consulta la base. Devuelve el commit desplegado (RENDER_GIT_COMMIT) o "local".',
  })
  @ApiOkResponse({ example: { estado: 'vivo', version: 'a1b2c3d' } })
  vivo(): { estado: 'vivo'; version: string } {
    return { estado: 'vivo', version: this.config.renderGitCommit };
  }
}
