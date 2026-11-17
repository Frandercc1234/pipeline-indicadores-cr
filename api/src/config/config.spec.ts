import { leerConfig } from './config';

const ENTORNO = {
  DATABASE_URL_API: 'postgresql://usuario:clave@host:5432/base',
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
});
