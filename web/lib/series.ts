import { aTimestamp, deTimestamp } from "./formato";

export type Rango = "1m" | "6m" | "1a" | "5a" | "todo";

export const RANGOS: { id: Rango; etiqueta: string; meses: number | null }[] = [
  { id: "1m", etiqueta: "1 mes", meses: 1 },
  { id: "6m", etiqueta: "6 meses", meses: 6 },
  { id: "1a", etiqueta: "1 año", meses: 12 },
  { id: "5a", etiqueta: "5 años", meses: 60 },
  { id: "todo", etiqueta: "Todo", meses: null },
];

/** Resta meses a una fecha YYYY-MM-DD y ajusta el día si el mes destino es más corto. */
export function restarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const total = anio * 12 + (mes - 1) - meses;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = total % 12;
  const ultimoDia = new Date(Date.UTC(nuevoAnio, nuevoMes + 1, 0)).getUTCDate();
  return deTimestamp(Date.UTC(nuevoAnio, nuevoMes, Math.min(dia, ultimoDia)));
}

/** Primera fecha del rango pedido, contando hacia atrás desde la última fecha disponible. */
export function desdeDelRango(ultimaFecha: string, rango: Rango): number | null {
  const meses = RANGOS.find((r) => r.id === rango)?.meses ?? null;
  return meses === null ? null : aTimestamp(restarMeses(ultimaFecha, meses));
}

/** Se queda con `maximo` puntos repartidos parejo, siempre con el primero y el último. */
export function reducir<T>(items: T[], maximo: number): T[] {
  if (items.length <= maximo) return items;
  const salida: T[] = [];
  for (let i = 0; i < maximo; i++) {
    salida.push(items[Math.round((i * (items.length - 1)) / (maximo - 1))]);
  }
  return salida;
}

/** Trazo SVG de un minigráfico en un lienzo de `ancho` x `alto`. */
export function rutaChispa(
  valores: number[],
  ancho = 160,
  alto = 40,
  margen = 4,
): string {
  if (valores.length < 2) return "";
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min;
  return valores
    .map((valor, i) => {
      const x = (i / (valores.length - 1)) * ancho;
      const y =
        rango === 0
          ? alto / 2
          : margen + (1 - (valor - min) / rango) * (alto - 2 * margen);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
}

/** Marcas "redondas" (1, 2, 5 por una potencia de 10) que cubren [min, max]. */
export function marcasDelEje(min: number, max: number, cantidad = 4): number[] {
  if (min === max) {
    const paso = Math.abs(min) > 1 ? Math.pow(10, Math.floor(Math.log10(Math.abs(min)))) : 1;
    return [min - paso, min, min + paso];
  }
  const crudo = (max - min) / cantidad;
  const potencia = Math.pow(10, Math.floor(Math.log10(crudo)));
  const fraccion = crudo / potencia;
  const base = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
  const paso = base * potencia;
  const inicio = Math.floor(min / paso) * paso;
  const fin = Math.ceil(max / paso) * paso;
  const marcas: number[] = [];
  for (let v = inicio; v <= fin + paso / 2; v += paso) {
    marcas.push(Math.round(v / paso) * paso);
  }
  return marcas;
}
