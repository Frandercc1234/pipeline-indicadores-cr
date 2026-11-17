"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLOR, type ColorSerie } from "@/lib/colores";
import {
  anio,
  aTimestamp,
  deTimestamp,
  diaYMesCorto,
  fechaCorta,
  mesCorto,
} from "@/lib/formato";
import { formatoEje, formatoValor, type TipoValor } from "@/lib/indicadores";
import { marcasDelEje } from "@/lib/series";

export interface SerieGrafico {
  clave: string;
  nombre: string;
  color: ColorSerie;
  /** Etiqueta directa: la de arriba va en tinta y la de abajo en tinta-2. */
  etiqueta: "principal" | "secundaria";
  datos: { fecha: string; valor: number }[];
}

type Fila = { t: number } & Record<string, number>;

/** Suscripción a una media query. En el servidor responde false (diseño de escritorio). */
function useMedia(consulta: string): boolean {
  return useSyncExternalStore(
    (aviso) => {
      const lista = window.matchMedia(consulta);
      lista.addEventListener("change", aviso);
      return () => lista.removeEventListener("change", aviso);
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}

function fusionar(series: SerieGrafico[]): Fila[] {
  const porFecha = new Map<number, Fila>();
  for (const serie of series) {
    for (const punto of serie.datos) {
      const t = aTimestamp(punto.fecha);
      const fila = porFecha.get(t) ?? ({ t } as Fila);
      fila[serie.clave] = punto.valor;
      porFecha.set(t, fila);
    }
  }
  return [...porFecha.values()].sort((a, b) => a.t - b.t);
}

function etiquetaDelEje(t: number, indice: number, total: number, dias: number): string {
  const fecha = deTimestamp(t);
  const extremo = indice === 0 || indice === total - 1;
  if (dias <= 45) return diaYMesCorto(fecha);
  if (extremo) return `${mesCorto(fecha)} ${anio(fecha)}`;
  return dias <= 400 ? mesCorto(fecha) : String(anio(fecha));
}

interface PropsTickX {
  x?: number;
  y?: number;
  payload?: { value: number };
  index?: number;
  total: number;
  dias: number;
}

/** Marca del eje X: la primera alineada a la izquierda y la última a la derecha. */
function TickX({ x = 0, y = 0, payload, index = 0, total, dias }: PropsTickX) {
  const ancla = index === 0 ? "start" : index === total - 1 ? "end" : "middle";
  return (
    <text x={x} y={y + 14} textAnchor={ancla} fontSize={12} fill={COLOR.tinta3}>
      {etiquetaDelEje(payload?.value ?? 0, index, total, dias)}
    </text>
  );
}

interface PropsTickY {
  x?: number;
  y?: number;
  payload?: { value: number };
  tipo: TipoValor;
}

/** Marca del eje Y: las únicas cifras tabulares fuera de las tablas. */
function TickY({ x = 0, y = 0, payload, tipo }: PropsTickY) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={12}
      fill={COLOR.tinta3}
      className="tabular-nums"
    >
      {formatoEje(tipo, payload?.value ?? 0)}
    </text>
  );
}

interface PropsEtiqueta {
  x?: number;
  y?: number;
  index?: number;
  value?: number;
  total: number;
  tipo: TipoValor;
  principal: boolean;
  movil: boolean;
}

/** Valor del último dato, escrito a la derecha del gráfico, fuera del área de trazado. */
function EtiquetaFinal({
  x = 0,
  y = 0,
  index,
  value,
  total,
  tipo,
  principal,
  movil,
}: PropsEtiqueta) {
  if (index !== total - 1 || value === undefined) return null;
  return (
    <text
      x={x + 8}
      y={y + (principal ? 0 : 10)}
      dy={4}
      fontSize={movil ? 12 : 13}
      fontWeight={600}
      fill={principal ? COLOR.tinta : COLOR.tinta2}
    >
      {formatoValor(tipo, value)}
    </text>
  );
}

interface PropsTooltip {
  active?: boolean;
  label?: number | string;
  payload?: { dataKey?: string | number; value?: number }[];
  series: SerieGrafico[];
  tipo: TipoValor;
}

function ContenidoTooltip({ active, label, payload, series, tipo }: PropsTooltip) {
  if (!active || !payload?.length || typeof label !== "number") return null;
  return (
    <div className="rounded-control bg-tinta px-3 py-2 text-[13px] leading-[1.45] whitespace-nowrap text-white">
      <b className="font-semibold">{fechaCorta(deTimestamp(label))}</b>
      {series.map((serie) => {
        const valor = payload.find((p) => p.dataKey === serie.clave)?.value;
        return valor === undefined ? null : (
          <div key={serie.clave}>
            {serie.nombre} {formatoValor(tipo, valor)}
          </div>
        );
      })}
    </div>
  );
}

export default function GraficoSerie({
  series,
  tipo,
  ariaLabel,
}: {
  series: SerieGrafico[];
  tipo: TipoValor;
  ariaLabel: string;
}) {
  const movil = useMedia("(max-width: 600px)");
  const sinMovimiento = useMedia("(prefers-reduced-motion: reduce)");

  const filas = useMemo(() => fusionar(series), [series]);
  const { marcas, tope, marcasX, dias } = useMemo(() => {
    const valores = series.flatMap((s) => s.datos.map((d) => d.valor));
    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const t0 = filas[0]?.t ?? 0;
    const t1 = filas.at(-1)?.t ?? 0;
    const cantidad = movil ? 3 : 5;
    // El eje llega un poco más arriba del dato máximo; no se dibuja una marca que sobre.
    const holgura = (maximo - minimo) * 0.04 || Math.abs(maximo) * 0.02 || 1;
    const tope = maximo + holgura;
    const todas = marcasDelEje(minimo, maximo, 4);
    return {
      tope,
      marcas: todas.filter((m, i) => i === 0 || m <= tope),
      marcasX: Array.from({ length: cantidad }, (_, i) => t0 + ((t1 - t0) * i) / (cantidad - 1)),
      dias: (t1 - t0) / 86_400_000,
    };
  }, [series, filas, movil]);

  const alto = movil ? 224 : 324; // área de trazado de 200 o 300 px más el eje X
  // El eje Y se ensancha si la marca más larga (por ejemplo "10,5 %") no cabe en 44 px.
  const largoMarca = Math.max(...marcas.map((m) => formatoEje(tipo, m).length));
  const anchoEjeY = Math.max(movil ? 36 : 44, Math.ceil(largoMarca * 6.8) + 12);
  const colores: Record<ColorSerie, string> = {
    venta: COLOR.venta,
    compra: COLOR.compra,
    tinta: COLOR.tinta,
  };

  return (
    // overflow-x-clip: antes de hidratar el SVG mide 1000 px (initialDimension) y no debe ensanchar la página.
    <div role="img" aria-label={ariaLabel} className="mt-4 w-full overflow-x-clip">
      <ResponsiveContainer width="100%" height={alto} initialDimension={{ width: 1000, height: alto }}>
        <LineChart
          data={filas}
          margin={{ top: 8, right: movil ? 58 : 68, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} horizontalValues={marcas} stroke={COLOR.tramaSuave} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[marcasX[0], marcasX[marcasX.length - 1]]}
            ticks={marcasX}
            interval={0}
            minTickGap={0}
            axisLine={false}
            tickLine={false}
            tick={<TickX total={marcasX.length} dias={dias} />}
            height={24}
          />
          <YAxis
            domain={[marcas[0], Math.max(tope, marcas[marcas.length - 1])]}
            ticks={marcas}
            width={anchoEjeY}
            axisLine={false}
            tickLine={false}
            tick={<TickY tipo={tipo} />}
          />
          <Tooltip
            cursor={{ stroke: COLOR.tinta3, strokeOpacity: 0.5, strokeWidth: 1 }}
            content={<ContenidoTooltip series={series} tipo={tipo} />}
            position={{ y: 8 }}
            isAnimationActive={false}
          />
          {series.map((serie) => (
            <Line
              key={serie.clave}
              dataKey={serie.clave}
              type="linear"
              stroke={colores[serie.color]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 3, fill: colores[serie.color], stroke: COLOR.tinta, strokeWidth: 0 }}
              isAnimationActive={!sinMovimiento}
              animationDuration={1400}
              connectNulls
              label={
                <EtiquetaFinal
                  total={filas.length}
                  tipo={tipo}
                  principal={serie.etiqueta === "principal"}
                  movil={movil}
                />
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
