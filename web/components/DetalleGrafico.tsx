"use client";

import { useMemo, useState } from "react";
import type { ColorSerie } from "@/lib/colores";
import { aTimestamp } from "@/lib/formato";
import { formatoValor, type TipoValor } from "@/lib/indicadores";
import { desdeDelRango, RANGOS, type Rango } from "@/lib/series";
import { BOTON_SECUNDARIO } from "./botones";
import EstadoVacio from "./EstadoVacio";
import GraficoSerie from "./GraficoSerie";

const PERIODO: Record<Rango, string> = {
  "1m": "del mes",
  "6m": "de los 6 meses",
  "1a": "del año",
  "5a": "de los 5 años",
  todo: "del historial",
};

const VACIO: Record<Rango, string> = {
  "1m": "No hay datos en el último mes",
  "6m": "No hay datos en los últimos 6 meses",
  "1a": "No hay datos en el último año",
  "5a": "No hay datos en los últimos 5 años",
  todo: "Todavía no hay datos publicados",
};

/** Gráfico del detalle con el selector de rango. Filtra en el navegador: no vuelve a llamar a la API. */
export default function DetalleGrafico({
  nombre,
  tipo,
  color,
  periodicidad,
  datos,
}: {
  nombre: string;
  tipo: TipoValor;
  color: ColorSerie;
  periodicidad: string;
  datos: [string, number][];
}) {
  const [rango, setRango] = useState<Rango>("1a");

  const visibles = useMemo(() => {
    const ultima = datos.at(-1)?.[0];
    if (!ultima) return [];
    const desde = desdeDelRango(ultima, rango);
    return datos
      .filter(([fecha]) => desde === null || aTimestamp(fecha) >= desde)
      .map(([fecha, valor]) => ({ fecha, valor }));
  }, [datos, rango]);

  const series = useMemo(
    () => [{ clave: "valor", nombre, color, etiqueta: "principal" as const, datos: visibles }],
    [nombre, color, visibles],
  );

  const valores = visibles.map((d) => d.valor);
  const hayGrafico = visibles.length >= 2;

  return (
    <figure
      data-panel
      className="mt-8 -mx-2 rounded-panel border border-trama bg-superficie px-3 pt-4 pb-3 sm:mx-0 sm:px-6 sm:pt-6 sm:pb-4"
    >
      <div
        role="group"
        aria-label="Rango del gráfico"
        className="flex gap-0.5 rounded-control border border-borde-control bg-superficie p-[3px] sm:inline-flex"
      >
        {RANGOS.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            aria-pressed={rango === opcion.id}
            onClick={() => setRango(opcion.id)}
            className="min-h-11 flex-1 cursor-pointer rounded-[4px] px-1 py-[9px] text-[13px] leading-none font-medium whitespace-nowrap text-tinta-2 hover:bg-marca-suave hover:text-tinta aria-pressed:bg-tinta aria-pressed:text-white sm:flex-none sm:px-3 sm:text-sm"
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {hayGrafico ? (
        <>
          <GraficoSerie
            series={series}
            tipo={tipo}
            ariaLabel={`${nombre}, ${RANGOS.find((r) => r.id === rango)?.etiqueta}`}
          />
          <figcaption className="mt-3 flex flex-wrap justify-between gap-4 text-[13px] text-tinta-3">
            <span>
              Mínimo {PERIODO[rango]} {formatoValor(tipo, Math.min(...valores))}. Máximo{" "}
              {formatoValor(tipo, Math.max(...valores))}.
            </span>
          </figcaption>
        </>
      ) : (
        <div className="mt-4">
          <EstadoVacio
            titulo={VACIO[rango]}
            texto={
              periodicidad === "mensual"
                ? "El BCCR publica este indicador una vez al mes. Elegí un rango más largo."
                : "El BCCR no publicó datos en este rango. Elegí un rango más largo."
            }
          >
            {rango !== "1a" && (
              <button type="button" className={BOTON_SECUNDARIO} onClick={() => setRango("1a")}>
                Ver 1 año
              </button>
            )}
          </EstadoVacio>
        </div>
      )}
    </figure>
  );
}
