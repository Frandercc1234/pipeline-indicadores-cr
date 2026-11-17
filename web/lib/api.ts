/**
 * Cliente de la API de indicadores. Solo se usa en el servidor (API_URL no es pública).
 * Cada lectura se cachea una hora (ISR). Si la API duerme, espera hasta 90 s y reintenta 2 veces.
 */

export interface Observacion {
  fecha: string;
  valor: number;
}

export interface Indicador {
  slug: string;
  codigoBccr: number;
  nombre: string;
  unidad: string;
  periodicidad: string;
  ultimo: Observacion | null;
  anterior: Observacion | null;
}

export interface Serie {
  slug: string;
  nombre: string;
  unidad: string;
  desde: string;
  hasta: string;
  datos: Observacion[];
}

export interface Salud {
  estado: string;
  ultimaCarga: { tipo: string; fin: string; estado: string } | null;
}

export class ApiError extends Error {
  constructor(
    mensaje: string,
    readonly estado?: number,
  ) {
    super(mensaje);
    this.name = "ApiError";
  }
}

/** La API respondió 400 o 404: el recurso no existe (no se reintenta). */
export class NoEncontrado extends ApiError {
  constructor() {
    super("No encontrado", 404);
    this.name = "NoEncontrado";
  }
}

const TIMEOUT_MS = 90_000;
const REINTENTOS = 2;
const ESPERAS_MS = [1_000, 3_000];
const REVALIDAR_S = 3_600;

function urlBase(): string {
  const base = process.env.API_URL;
  if (!base) throw new ApiError("Falta la variable API_URL");
  return base.replace(/\/$/, "");
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pedir<T>(ruta: string): Promise<T> {
  const url = `${urlBase()}${ruta}`;
  let ultimoError: unknown;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    try {
      const respuesta = await fetch(url, {
        next: { revalidate: REVALIDAR_S },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (respuesta.status === 400 || respuesta.status === 404) {
        throw new NoEncontrado();
      }
      if (!respuesta.ok) {
        throw new ApiError(`La API respondió ${respuesta.status}`, respuesta.status);
      }
      return (await respuesta.json()) as T;
    } catch (error) {
      if (error instanceof NoEncontrado) throw error;
      ultimoError = error;
      if (intento < REINTENTOS) await dormir(ESPERAS_MS[intento]);
    }
  }
  throw new ApiError(
    ultimoError instanceof Error ? ultimoError.message : "La API no respondió",
  );
}

export function obtenerIndicadores(): Promise<Indicador[]> {
  return pedir<Indicador[]>("/indicadores");
}

export function obtenerIndicador(slug: string): Promise<Indicador> {
  return pedir<Indicador>(`/indicadores/${encodeURIComponent(slug)}`);
}

/** Sin `desde`, la API devuelve desde 2015. Sin `hasta`, hasta la última fecha disponible. */
export function obtenerSerie(slug: string, desde?: string): Promise<Serie> {
  const consulta = desde ? `?desde=${desde}` : "";
  return pedir<Serie>(`/indicadores/${encodeURIComponent(slug)}/serie${consulta}`);
}

/** El estado de salud es opcional en la interfaz: si falla, devuelve null. */
export async function obtenerSalud(): Promise<Salud | null> {
  try {
    return await pedir<Salud>("/salud");
  } catch {
    return null;
  }
}
