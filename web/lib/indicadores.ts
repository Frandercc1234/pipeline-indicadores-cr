import type { ColorSerie } from "./colores";
import type { Indicador, Observacion } from "./api";
import {
  colones,
  diaYMesCorto,
  fechaSinDia,
  mesYAnio,
  nombreDelMes,
  numero,
  porcentaje,
} from "./formato";

export type TipoValor = "colones" | "indice" | "porcentaje";

interface Textos {
  titulo: string;
  descripcion: string;
  tipo: TipoValor;
  columna: string;
  color: ColorSerie;
}

/** Rótulos del diseño. Las cifras y las fechas salen siempre de la API. */
const TEXTOS: Record<string, Textos> = {
  tc_compra: {
    titulo: "Tipo de cambio de compra",
    descripcion: "Tipo de cambio de referencia, compra",
    tipo: "colones",
    columna: "Compra (₡)",
    color: "compra",
  },
  tc_venta: {
    titulo: "Tipo de cambio de venta",
    descripcion: "Tipo de cambio de referencia, venta",
    tipo: "colones",
    columna: "Venta (₡)",
    color: "venta",
  },
  ipc_interanual: {
    titulo: "Inflación interanual",
    descripcion: "Variación del IPC en 12 meses",
    tipo: "porcentaje",
    columna: "Variación (%)",
    color: "tinta",
  },
  ipc_indice: {
    titulo: "Índice de precios al consumidor",
    descripcion: "Índice de precios al consumidor",
    tipo: "indice",
    columna: "Índice",
    color: "tinta",
  },
  tbp: {
    titulo: "Tasa básica pasiva",
    descripcion: "Tasa básica pasiva",
    tipo: "porcentaje",
    columna: "Tasa (%)",
    color: "tinta",
  },
  tpm: {
    titulo: "Tasa de política monetaria",
    descripcion: "Tasa de política monetaria",
    tipo: "porcentaje",
    columna: "Tasa (%)",
    color: "tinta",
  },
};

export function textosDe(indicador: Pick<Indicador, "slug" | "nombre" | "unidad">): Textos {
  return (
    TEXTOS[indicador.slug] ?? {
      titulo: indicador.nombre,
      descripcion: indicador.nombre,
      tipo: "indice",
      columna: "Valor",
      color: "tinta",
    }
  );
}

/** Cifra de un valor según su tipo: ₡448,40, 99,92 o 3,56 %. */
export function formatoValor(tipo: TipoValor, valor: number): string {
  if (tipo === "colones") return colones(valor);
  if (tipo === "porcentaje") return porcentaje(valor);
  return numero(valor);
}

/** Marca del eje Y: sin decimales cuando son enteros. */
export function formatoEje(tipo: TipoValor, valor: number): string {
  const entero = Number.isInteger(valor);
  const texto = entero
    ? new Intl.NumberFormat("es-CR").format(valor)
    : new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2 }).format(valor);
  const limpio = texto.replace("-", "−");
  if (tipo === "colones") return `₡${limpio}`;
  if (tipo === "porcentaje") return `${limpio} %`;
  return limpio;
}

export interface Cambio {
  direccion: "sube" | "baja" | "igual";
  /** Monto sin signo: ₡0,06, 0,21 p.p. o 0,39 %. Vacío si no cambió. */
  monto: string;
}

/** Cambio entre dos datos: en colones, en puntos porcentuales o, para el índice, en %. */
export function calcularCambio(
  tipo: TipoValor,
  ultimo: Observacion,
  anterior: Observacion,
): Cambio {
  // Se calcula sobre las cifras tal como se muestran (2 decimales), para que la resta se pueda
  // verificar a ojo: 0,55 menos 0,34 son 0,21.
  const mostrado = (valor: number) => Math.round(valor * 100) / 100;
  const nuevo = mostrado(ultimo.valor);
  const previo = mostrado(anterior.valor);
  const delta = tipo === "indice" ? ((nuevo - previo) / previo) * 100 : nuevo - previo;
  const redondeado = Math.round(Math.abs(delta) * 100) / 100;
  if (redondeado === 0) return { direccion: "igual", monto: "" };
  const monto =
    tipo === "colones"
      ? colones(redondeado)
      : tipo === "porcentaje"
        ? `${numero(redondeado)} p.p.`
        : `${numero(redondeado)} %`;
  return { direccion: delta > 0 ? "sube" : "baja", monto };
}

export const FLECHA = { sube: "▲", baja: "▼" } as const;

/** Línea de apoyo bajo el nombre de un indicador. */
export function subtitulo(indicador: Indicador): string {
  const textos = textosDe(indicador);
  if (!indicador.ultimo) return "El BCCR no ha publicado datos";
  if (indicador.periodicidad === "mensual") {
    const detalle =
      indicador.slug === "ipc_indice"
        ? mayuscula(indicador.unidad)
        : textos.descripcion;
    return `${detalle}, ${mesYAnio(indicador.ultimo.fecha)}`;
  }
  return `Vigente al ${fechaSinDia(indicador.ultimo.fecha)}`;
}

/** "desde setiembre" (mensual) o "desde el 16 nov" (diario). */
export function desdeCuando(indicador: Indicador, anterior: Observacion): string {
  return indicador.periodicidad === "mensual"
    ? `desde ${nombreDelMes(anterior.fecha)}`
    : `desde el ${diaYMesCorto(anterior.fecha)}`;
}

export function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function nombreDePeriodicidad(periodicidad: string): string {
  const mapa: Record<string, string> = {
    diaria: "Diario",
    semanal: "Semanal",
    mensual: "Mensual",
    irregular: "Irregular",
  };
  return mapa[periodicidad] ?? mayuscula(periodicidad);
}
