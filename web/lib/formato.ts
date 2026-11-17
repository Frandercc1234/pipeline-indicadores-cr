/** Formato de números y fechas en español de Costa Rica. Se usa en servidor y en cliente. */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "set",
  "oct",
  "nov",
  "dic",
];
const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const DOS_DECIMALES = new Intl.NumberFormat("es-CR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const MENOS = "−";
const ESPACIO_FIJO = " ";

/** 1234,5 con dos decimales. El signo negativo es el menos tipográfico (−), no el guion. */
export function numero(valor: number): string {
  const texto = DOS_DECIMALES.format(Math.abs(valor));
  const esCero = Number(texto.replace(/[^\d]/g, "")) === 0;
  return valor < 0 && !esCero ? `${MENOS}${texto}` : texto;
}

export function colones(valor: number): string {
  return `₡${numero(valor)}`;
}

export function porcentaje(valor: number): string {
  return `${numero(valor)}${ESPACIO_FIJO}%`;
}

/** +0,06, −0,03 o 0,00. */
export function conSigno(valor: number): string {
  const texto = numero(valor);
  return valor > 0 && texto !== "0,00" ? `+${texto}` : texto;
}

function partes(fecha: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return { anio, mes, dia };
}

export function diaDeLaSemana(fecha: string): string {
  const { anio, mes, dia } = partes(fecha);
  return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

/** 17 nov 2026 */
export function fechaCorta(fecha: string): string {
  const { anio, mes, dia } = partes(fecha);
  return `${dia} ${MESES_CORTOS[mes - 1]} ${anio}`;
}

/** martes 17 de noviembre de 2026 */
export function fechaLarga(fecha: string): string {
  const { anio, mes, dia } = partes(fecha);
  return `${diaDeLaSemana(fecha)} ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** 18 de noviembre de 2026 */
export function fechaSinDia(fecha: string): string {
  const { anio, mes, dia } = partes(fecha);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** lunes 16 */
export function diaYNumero(fecha: string): string {
  return `${diaDeLaSemana(fecha)} ${partes(fecha).dia}`;
}

/** 16 nov */
export function diaYMesCorto(fecha: string): string {
  const { mes, dia } = partes(fecha);
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

/** octubre 2026 */
export function mesYAnio(fecha: string): string {
  const { anio, mes } = partes(fecha);
  return `${MESES[mes - 1]} ${anio}`;
}

/** setiembre */
export function nombreDelMes(fecha: string): string {
  return MESES[partes(fecha).mes - 1];
}

/** nov */
export function mesCorto(fecha: string): string {
  return MESES_CORTOS[partes(fecha).mes - 1];
}

export function anio(fecha: string): number {
  return partes(fecha).anio;
}

/** Fecha y hora (Costa Rica, UTC-6) de un instante ISO: "17 nov 2026, 06:15". */
export function fechaHoraCostaRica(iso: string): string {
  const local = new Date(new Date(iso).getTime() - 6 * 3_600_000);
  const dia = `${local.getUTCDate()} ${MESES_CORTOS[local.getUTCMonth()]} ${local.getUTCFullYear()}`;
  const hora = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  return `${dia}, ${hora}`;
}

/** Marca de tiempo UTC (ms) de una fecha YYYY-MM-DD. */
export function aTimestamp(fecha: string): number {
  const { anio: a, mes, dia } = partes(fecha);
  return Date.UTC(a, mes - 1, dia);
}

export function deTimestamp(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
