/** Costa Rica es UTC-6 todo el año (no usa horario de verano). */
const DESFASE_COSTA_RICA_MS = 6 * 60 * 60 * 1000;

/** Fecha de hoy en Costa Rica, como YYYY-MM-DD. */
export function hoyCostaRica(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - DESFASE_COSTA_RICA_MS)
    .toISOString()
    .slice(0, 10);
}
