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

/** Hosts donde no hace falta TLS: la base local o el servicio `db` de docker compose. */
const HOSTS_SIN_SSL = ['localhost', '127.0.0.1', 'db'];

/** Fuera de la máquina local, la conexión a la base exige sslmode=require. */
function exigirSsl(cadena: string): void {
  let url: URL;
  try {
    url = new URL(cadena);
  } catch {
    // Sin el valor: la cadena lleva la contraseña.
    throw new Error('DATABASE_URL_API no es una URL válida');
  }
  const esLocal = HOSTS_SIN_SSL.includes(url.hostname.toLowerCase());
  if (!esLocal && url.searchParams.get('sslmode') !== 'require') {
    throw new Error('DATABASE_URL_API debe incluir sslmode=require');
  }
}

/** Lee y valida las variables de entorno. Nunca incluye valores en los errores. */
export function leerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const faltan = OBLIGATORIAS.filter((nombre) => !env[nombre]);
  if (faltan.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}`);
  }
  exigirSsl(env.DATABASE_URL_API!);
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
