/**
 * Colores que Recharts pide por prop. Leen los tokens de @theme (globals.css), no hay hex aquí.
 */
export const COLOR = {
  tinta: "var(--color-tinta)",
  tinta2: "var(--color-tinta-2)",
  tinta3: "var(--color-tinta-3)",
  trama: "var(--color-trama)",
  tramaSuave: "var(--color-trama-suave)",
  marca: "var(--color-marca)",
  venta: "var(--color-serie-venta)",
  compra: "var(--color-serie-compra)",
} as const;

export type ColorSerie = "venta" | "compra" | "tinta";
