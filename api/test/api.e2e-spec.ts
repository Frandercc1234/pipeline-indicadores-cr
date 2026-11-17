import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/comun/configurar-app';
import { CONFIG, leerConfig, type Config } from '../src/config/config';
import { PG_POOL } from '../src/db/db.module';

const SLUGS = [
  'tc_compra',
  'tc_venta',
  'ipc_indice',
  'ipc_interanual',
  'tbp',
  'tpm',
];
const HOSTS_LOCALES = ['localhost', '127.0.0.1', 'db', 'postgres'];

/** Pool que simula una base caída: toda consulta falla. */
const BASE_CAIDA = {
  query: () => Promise.reject(new Error('base caída: secreto-de-prueba')),
  end: () => Promise.resolve(),
};

async function crearApp(
  ajustes: Partial<Config> = {},
  pool?: unknown,
): Promise<NestExpressApplication> {
  const config = { ...leerConfig(), ...ajustes };
  let constructor = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CONFIG)
    .useValue(config);
  if (pool) constructor = constructor.overrideProvider(PG_POOL).useValue(pool);
  const modulo = await constructor.compile();
  const app = modulo.createNestApplication<NestExpressApplication>();
  configurarApp(app, config);
  await app.init();
  return app;
}

/** /salud pide una carga diaria reciente: la dejamos registrada (solo en una base local). */
async function registrarCargaDiaria(): Promise<void> {
  const url = process.env.DATABASE_URL_ETL;
  if (!url) throw new Error('Falta DATABASE_URL_ETL para preparar la prueba');
  if (!HOSTS_LOCALES.includes(new URL(url).hostname)) {
    throw new Error('Las pruebas e2e solo escriben en una base local');
  }
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(
      `INSERT INTO carga (tipo, modo, estado, fin) VALUES ('diaria', 'simulado', 'ok', now())`,
    );
  } finally {
    await cliente.end();
  }
}

function fixture(slug: string): { fecha: string; valor: number }[] {
  const crudo = JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', 'etl', 'tests', 'fixtures', `${slug}.json`),
      'utf8',
    ),
  ) as {
    datos: { series: { fecha: string; valorDatoPorPeriodo: number }[] }[];
  };
  return crudo.datos[0].series.map((s) => ({
    fecha: s.fecha.slice(0, 10),
    valor: s.valorDatoPorPeriodo,
  }));
}

describe('API de indicadores (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    await registrarCargaDiaria();
    // Límite alto: aquí no se prueba el 429.
    app = await crearApp({ throttleLimit: 10_000 });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  // supertest tipa `body` como any; aquí lo devolvemos como unknown y cada prueba lo acota.
  interface Respuesta {
    status: number;
    body: unknown;
    headers: Record<string, string>;
  }
  const pedir = async (
    ruta: string,
    query: Record<string, string> = {},
    servidor: Parameters<typeof request>[0] = app.getHttpServer(),
  ): Promise<Respuesta> => {
    const respuesta = await request(servidor).get(ruta).query(query);
    return {
      status: respuesta.status,
      body: respuesta.body as unknown,
      headers: respuesta.headers,
    };
  };

  describe('200', () => {
    it('GET /indicadores devuelve los 6 indicadores en orden', async () => {
      const { status, body, headers } = await pedir('/indicadores');
      expect(status).toBe(200);
      expect((body as { slug: string }[]).map((i) => i.slug)).toEqual(SLUGS);
      expect(headers['cache-control']).toBe('public, max-age=3600');
      expect(headers['x-content-type-options']).toBe('nosniff');
    });

    it('cada indicador trae ultimo con fecha y valor numérico', async () => {
      const { body } = await pedir('/indicadores');
      for (const indicador of body as {
        ultimo: { fecha: string; valor: number };
        anterior: { fecha: string };
      }[]) {
        expect(indicador.ultimo.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof indicador.ultimo.valor).toBe('number');
        expect(indicador.anterior.fecha < indicador.ultimo.fecha).toBe(true);
      }
    });

    it('GET /indicadores/:slug devuelve el detalle', async () => {
      const { status, body } = await pedir('/indicadores/tc_venta');
      expect(status).toBe(200);
      expect(body).toMatchObject({
        slug: 'tc_venta',
        codigoBccr: 318,
        periodicidad: 'diaria',
      });
    });

    it('la serie coincide con los datos reales del BCCR (fixture)', async () => {
      const esperado = fixture('tc_compra');
      const { status, body } = await pedir('/indicadores/tc_compra/serie', {
        desde: '2024-01-01',
        hasta: '2024-06-30',
      });
      expect(status).toBe(200);
      const respuesta = body as {
        desde: string;
        hasta: string;
        datos: { fecha: string; valor: number }[];
      };
      expect(respuesta.desde).toBe('2024-01-01');
      expect(respuesta.hasta).toBe('2024-06-30');
      expect(respuesta.datos).toHaveLength(esperado.length);
      respuesta.datos.forEach((dato, i) => {
        expect(dato.fecha).toBe(esperado[i].fecha);
        expect(dato.valor).toBeCloseTo(esperado[i].valor, 3);
      });
    });

    it('la serie sale ordenada por fecha ascendente', async () => {
      const { body } = await pedir('/indicadores/tpm/serie');
      const fechas = (body as { datos: { fecha: string }[] }).datos.map(
        (d) => d.fecha,
      );
      expect(fechas).toEqual([...fechas].sort());
    });

    it('sin parámetros usa desde 2015-01-01 y hasta hoy', async () => {
      const { body } = await pedir('/indicadores/tpm/serie');
      expect((body as { desde: string }).desde).toBe('2015-01-01');
      expect((body as { hasta: string }).hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('un rango sin datos devuelve datos vacío', async () => {
      const { status, body } = await pedir('/indicadores/ipc_indice/serie', {
        desde: '2015-01-01',
        hasta: '2015-01-02',
      });
      expect(status).toBe(200);
      expect((body as { datos: unknown[] }).datos).toEqual([]);
    });

    it('GET /salud responde ok con la última carga', async () => {
      const { status, body } = await pedir('/salud');
      expect(status).toBe(200);
      expect(body).toMatchObject({
        estado: 'ok',
        base: 'ok',
        ultimaCarga: { tipo: 'diaria', estado: 'ok' },
      });
      expect(
        (body as { horasDesdeUltimaCarga: number }).horasDesdeUltimaCarga,
      ).toBeLessThan(36);
    });

    it('GET /salud/vivo no toca la base y trae la versión', async () => {
      const { status, body } = await pedir('/salud/vivo');
      expect(status).toBe(200);
      expect(body).toEqual({ estado: 'vivo', version: 'local' });
    });

    it('Swagger: /docs y /docs-json', async () => {
      expect((await pedir('/docs')).status).toBe(200);
      const { status, body } = await pedir('/docs-json');
      expect(status).toBe(200);
      const documento = body as {
        info: { title: string };
        paths: Record<string, unknown>;
      };
      expect(documento.info.title).toBe(
        'API de indicadores económicos de Costa Rica',
      );
      expect(Object.keys(documento.paths)).toEqual(
        expect.arrayContaining([
          '/indicadores',
          '/indicadores/{slug}',
          '/indicadores/{slug}/serie',
          '/salud',
          '/salud/vivo',
        ]),
      );
    });
  });

  describe('400', () => {
    it.each([
      ['slug con mayúsculas', '/indicadores/TC_VENTA'],
      ['slug con guion', '/indicadores/tc-venta'],
      ['slug con números', '/indicadores/tc1'],
      ['slug inválido en la serie', '/indicadores/TC1/serie'],
      [
        'fecha con otro formato',
        '/indicadores/tc_venta/serie?desde=2024/01/01',
      ],
      ['fecha inexistente', '/indicadores/tc_venta/serie?hasta=2023-02-30'],
      [
        'desde posterior a hasta',
        '/indicadores/tc_venta/serie?desde=2024-02-01&hasta=2024-01-01',
      ],
      ['desde anterior a 2015', '/indicadores/tc_venta/serie?desde=2014-12-31'],
      ['parámetro no permitido', '/indicadores/tc_venta/serie?otro=1'],
    ])('%s', async (_nombre, ruta) => {
      const { status, body } = await pedir(ruta);
      expect(status).toBe(400);
      expect(Object.keys(body as object).sort()).toEqual([
        'error',
        'mensaje',
        'statusCode',
      ]);
      expect(body).toMatchObject({
        statusCode: 400,
        error: 'Solicitud inválida',
      });
    });
  });

  describe('404', () => {
    it('indicador que no existe', async () => {
      const { status, body } = await pedir('/indicadores/no_existe');
      expect(status).toBe(404);
      expect(body).toEqual({
        statusCode: 404,
        error: 'No encontrado',
        mensaje: "No existe el indicador 'no_existe'",
      });
    });

    it('serie de un indicador que no existe', async () => {
      const { status } = await pedir('/indicadores/no_existe/serie');
      expect(status).toBe(404);
    });

    it('ruta que no existe, sin stack trace', async () => {
      const { status, body } = await pedir('/nada');
      expect(status).toBe(404);
      expect(body).toEqual({
        statusCode: 404,
        error: 'No encontrado',
        mensaje: 'La ruta no existe',
      });
    });

    it('solo hay GET: un POST no encuentra la ruta', async () => {
      const { status } = await http().post('/indicadores').send({});
      expect(status).toBe(404);
    });
  });

  describe('Cache-Control', () => {
    const PUBLICO = 'public, max-age=3600';

    it.each([
      '/indicadores',
      '/indicadores/tc_venta',
      '/indicadores/tc_venta/serie',
    ])('200 en %s: se cachea una hora', async (ruta) => {
      const { status, headers } = await pedir(ruta);
      expect(status).toBe(200);
      expect(headers['cache-control']).toBe(PUBLICO);
    });

    it.each([
      ['400 por slug inválido', '/indicadores/TC_VENTA', 400],
      [
        '400 por fecha inválida',
        '/indicadores/tc_venta/serie?desde=2023-02-30',
        400,
      ],
      ['404 por indicador inexistente', '/indicadores/no_existe', 404],
      [
        '404 en la serie de un indicador inexistente',
        '/indicadores/no_existe/serie',
        404,
      ],
      ['404 por ruta inexistente', '/nada', 404],
    ])('%s: no-store, nunca public', async (_nombre, ruta, estado) => {
      const { status, headers } = await pedir(ruta);
      expect(status).toBe(estado);
      expect(headers['cache-control']).toBe('no-store');
    });

    it('/salud y /salud/vivo no se cachean', async () => {
      expect((await pedir('/salud')).headers['cache-control']).toBe('no-store');
      expect((await pedir('/salud/vivo')).headers['cache-control']).toBe(
        'no-store',
      );
    });

    describe('con la base caída', () => {
      let caida: NestExpressApplication;

      beforeAll(async () => {
        caida = await crearApp({ throttleLimit: 10_000 }, BASE_CAIDA);
      });

      afterAll(async () => {
        await caida.close();
      });

      it('500 en /indicadores: no-store y sin filtrar el error interno', async () => {
        const registro = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => undefined);
        const { status, body, headers } = await pedir(
          '/indicadores',
          {},
          caida.getHttpServer(),
        );
        registro.mockRestore();
        expect(status).toBe(500);
        expect(headers['cache-control']).toBe('no-store');
        expect(body).toEqual({
          statusCode: 500,
          error: 'Error interno',
          mensaje: 'Ocurrió un error inesperado',
        });
        expect(JSON.stringify(body)).not.toContain('secreto-de-prueba');
      });

      it('500 en la serie: no-store', async () => {
        const registro = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => undefined);
        const { status, headers } = await pedir(
          '/indicadores/tc_venta/serie',
          {},
          caida.getHttpServer(),
        );
        registro.mockRestore();
        expect(status).toBe(500);
        expect(headers['cache-control']).toBe('no-store');
      });

      it('503 en /salud: degradado, base en error y no-store', async () => {
        const registro = jest
          .spyOn(Logger.prototype, 'warn')
          .mockImplementation(() => undefined);
        const { status, body, headers } = await pedir(
          '/salud',
          {},
          caida.getHttpServer(),
        );
        registro.mockRestore();
        expect(status).toBe(503);
        expect(headers['cache-control']).toBe('no-store');
        expect(body).toMatchObject({ estado: 'degradado', base: 'error' });
      });
    });
  });

  describe('429', () => {
    it('corta a la cuarta petición cuando el límite es 3', async () => {
      const limitada = await crearApp({
        throttleLimit: 3,
        throttleTtlMs: 60_000,
      });
      try {
        const servidor = limitada.getHttpServer();
        for (let i = 0; i < 3; i++) {
          expect((await pedir('/salud/vivo', {}, servidor)).status).toBe(200);
        }
        const { status, body, headers } = await pedir(
          '/salud/vivo',
          {},
          servidor,
        );
        expect(status).toBe(429);
        expect(headers['cache-control']).toBe('no-store');
        expect(body).toMatchObject({
          statusCode: 429,
          error: 'Demasiadas peticiones',
        });
        expect(Object.keys(body as object).sort()).toEqual([
          'error',
          'mensaje',
          'statusCode',
        ]);
      } finally {
        await limitada.close();
      }
    });
  });
});
