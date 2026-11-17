import { leerConfig } from './config';

const ENTORNO = {
  DATABASE_URL_API: 'postgresql://usuario:clave@127.0.0.1:5433/base',
  CORS_ORIGENES: 'http://localhost:3000, https://ejemplo.test',
  THROTTLE_LIMIT: '60',
  THROTTLE_TTL_MS: '60000',
};

describe('leerConfig', () => {
  it('lee y convierte las variables', () => {
    const config = leerConfig({ ...ENTORNO, PORT: '3001' });
    expect(config).toEqual({
      port: 3001,
      databaseUrl: ENTORNO.DATABASE_URL_API,
      corsOrigenes: ['http://localhost:3000', 'https://ejemplo.test'],
      throttleLimit: 60,
      throttleTtlMs: 60000,
      renderGitCommit: 'local',
    });
  });

  it('usa el puerto 3001 y la versión "local" por defecto', () => {
    const config = leerConfig(ENTORNO);
    expect(config.port).toBe(3001);
    expect(config.renderGitCommit).toBe('local');
  });

  it('toma la versión desde RENDER_GIT_COMMIT', () => {
    expect(
      leerConfig({ ...ENTORNO, RENDER_GIT_COMMIT: 'a1b2c3d' }).renderGitCommit,
    ).toBe('a1b2c3d');
  });

  it.each(Object.keys(ENTORNO))('falla si falta %s', (nombre) => {
    const entorno: NodeJS.ProcessEnv = { ...ENTORNO };
    delete entorno[nombre];
    expect(() => leerConfig(entorno)).toThrow(nombre);
  });

  it.each(['0', '-5', 'abc', '1.5'])(
    'rechaza THROTTLE_LIMIT inválido (%s)',
    (valor) => {
      expect(() => leerConfig({ ...ENTORNO, THROTTLE_LIMIT: valor })).toThrow(
        'THROTTLE_LIMIT',
      );
    },
  );

  it('el error no revela el valor de la base', () => {
    const entorno: NodeJS.ProcessEnv = { ...ENTORNO, THROTTLE_LIMIT: 'abc' };
    expect(() => leerConfig(entorno)).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('clave') as string,
      }) as Error,
    );
  });

  describe('sslmode=require fuera de la máquina local', () => {
    const MENSAJE = 'DATABASE_URL_API debe incluir sslmode=require';
    const con = (url: string): NodeJS.ProcessEnv => ({
      ...ENTORNO,
      DATABASE_URL_API: url,
    });

    it.each([
      'postgresql://u:clave-secreta@ep-ejemplo.neon.tech/indicadores',
      'postgresql://u:clave-secreta@ep-ejemplo.neon.tech/indicadores?sslmode=disable',
      'postgresql://u:clave-secreta@ep-ejemplo.neon.tech/indicadores?sslmode=prefer',
      'postgresql://u:clave-secreta@ep-ejemplo.neon.tech/indicadores?channel_binding=require',
      'postgresql://u:clave-secreta@10.0.0.5:5432/indicadores',
      'postgresql://u:clave-secreta@localhost.ejemplo.com/indicadores',
      'postgresql://u:clave-secreta@db.ejemplo.com/indicadores',
    ])('no arranca con un host remoto sin sslmode=require: %s', (url) => {
      expect(() => leerConfig(con(url))).toThrow(MENSAJE);
    });

    it.each([
      'postgresql://u:clave-secreta@ep-ejemplo.neon.tech/indicadores',
      'postgresql://u:clave-secreta@ep-ejemplo.neon.tech/indicadores?sslmode=disable',
    ])(
      'el mensaje no muestra la cadena, la contraseña ni el host: %s',
      (url) => {
        let mensaje = '';
        try {
          leerConfig(con(url));
        } catch (error) {
          mensaje = (error as Error).message;
        }
        expect(mensaje).toBe(MENSAJE);
        expect(mensaje).not.toContain('clave-secreta');
        expect(mensaje).not.toContain('ep-ejemplo');
        expect(mensaje).not.toContain('postgresql://');
      },
    );

    it.each([
      'postgresql://u:clave@ep-ejemplo.neon.tech/indicadores?sslmode=require',
      'postgresql://u:clave@ep-ejemplo.neon.tech/indicadores?sslmode=require&channel_binding=require',
      'postgresql://u:clave@ep-ejemplo.neon.tech/indicadores?channel_binding=require&sslmode=require',
    ])('arranca con sslmode=require: %s', (url) => {
      expect(leerConfig(con(url)).databaseUrl).toBe(url);
    });

    it.each([
      'postgresql://u:clave@localhost:5433/indicadores',
      'postgresql://u:clave@127.0.0.1:5433/indicadores',
      'postgresql://u:clave@db:5432/indicadores',
      'postgresql://u:clave@LOCALHOST:5433/indicadores',
    ])('en local no exige sslmode: %s', (url) => {
      expect(leerConfig(con(url)).databaseUrl).toBe(url);
    });

    it('una cadena que no es una URL falla sin mostrarla', () => {
      let mensaje = '';
      try {
        leerConfig(con('esto-no-es-una-url-con-clave'));
      } catch (error) {
        mensaje = (error as Error).message;
      }
      expect(mensaje).toBe('DATABASE_URL_API no es una URL válida');
      expect(mensaje).not.toContain('clave');
    });
  });
});
