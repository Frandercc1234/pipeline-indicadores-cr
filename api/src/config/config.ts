export const CONFIG = Symbol('CONFIG');

export interface Config {
  port: number;
  databaseUrl: string;
  corsOrigenes: string[];
  throttleLimit: number;
  throttleTtlMs: number;
  renderGitCommit: string;
}

const OBLIGATORIAS = [
  'DATABASE_URL_API',
  'CORS_ORIGENES',
  'THROTTLE_LIMIT',
  'THROTTLE_TTL_MS',
] as const;

function entero(nombre: string, valor: string): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${nombre} debe ser un entero positivo`);
  }
  return numero;
}

/** Lee y valida las variables de entorno. Nunca incluye valores en los errores. */
export function leerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const faltan = OBLIGATORIAS.filter((nombre) => !env[nombre]);
  if (faltan.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}`);
  }
  const origenes = env
    .CORS_ORIGENES!.split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  if (origenes.length === 0) {
    throw new Error('CORS_ORIGENES no tiene ningún origen');
  }
  return {
    port: entero('PORT', env.PORT || '3001'),
    databaseUrl: env.DATABASE_URL_API!,
    corsOrigenes: origenes,
    throttleLimit: entero('THROTTLE_LIMIT', env.THROTTLE_LIMIT!),
    throttleTtlMs: entero('THROTTLE_TTL_MS', env.THROTTLE_TTL_MS!),
    renderGitCommit: env.RENDER_GIT_COMMIT || 'local',
  };
}
