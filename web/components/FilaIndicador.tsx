import Link from "next/link";
import type { Indicador } from "@/lib/api";
import {
  calcularCambio,
  desdeCuando,
  FLECHA,
  formatoValor,
  subtitulo,
  textosDe,
} from "@/lib/indicadores";
import { rutaChispa } from "@/lib/series";
import Cifra from "./Cifra";

/** Fila del libro de indicadores: nombre, minigráfico, valor y cambio. No es una tarjeta. */
export default function FilaIndicador({
  indicador,
  historial,
  rotuloHistorial,
}: {
  indicador: Indicador;
  /** Valores recientes para el minigráfico, del más viejo al más nuevo. */
  historial: number[];
  rotuloHistorial: string;
}) {
  const textos = textosDe(indicador);
  const { ultimo, anterior } = indicador;

  if (!ultimo) {
    return (
      <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-trama px-2 py-4">
        <div>
          <div className="text-[17px] leading-[1.3] font-semibold">{textos.titulo}</div>
          <div className="mt-0.5 text-sm text-tinta-3">{subtitulo(indicador)}</div>
        </div>
        <div className="text-sm text-tinta-2">Sin datos</div>
      </li>
    );
  }

  const cambio = anterior ? calcularCambio(textos.tipo, ultimo, anterior) : null;
  const primero = historial[0];
  const ruta = rutaChispa(historial);

  return (
    <li data-indicador={indicador.slug}>
      <Link
        href={`/indicador/${indicador.slug}`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-trama px-2 py-4 text-tinta no-underline hover:bg-white/70 md:grid-cols-[minmax(0,1.6fr)_160px_minmax(0,1fr)_minmax(0,1fr)_24px] md:gap-6"
      >
        <div className="col-span-2 min-w-0 md:col-span-1">
          <div className="text-[17px] leading-[1.3] font-semibold">{textos.titulo}</div>
          <div className="mt-0.5 text-sm text-tinta-3">{subtitulo(indicador)}</div>
        </div>

        {ruta ? (
          <svg
            className="row-span-2 h-8 w-[120px] self-center overflow-visible md:row-span-1 md:h-10 md:w-40"
            viewBox="0 0 160 40"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${rotuloHistorial}: de ${formatoValor(textos.tipo, primero)} a ${formatoValor(textos.tipo, historial[historial.length - 1])}`}
          >
            <path
              d={ruta}
              className="fill-none stroke-tinta stroke-[1.5] [vector-effect:non-scaling-stroke]"
            />
          </svg>
        ) : (
          <span className="row-span-2 md:row-span-1" aria-hidden="true" />
        )}

        <div className="text-right font-display text-[26px] leading-none tracking-[-0.005em] [font-weight:650] ancho-90 md:text-[30px]">
          <Cifra tipo={textos.tipo} valor={ultimo.valor} />
        </div>

        <div className="text-right text-sm text-tinta-2 md:text-left">
          {!cambio || !anterior ? null : cambio.direccion === "igual" ? (
            "Sin cambio"
          ) : (
            <>
              <span aria-hidden="true">{FLECHA[cambio.direccion]}</span>
              <span className="sr-only">{cambio.direccion === "sube" ? "Sube " : "Baja "}</span>{" "}
              <b className="font-semibold text-tinta">{cambio.monto}</b>{" "}
              {desdeCuando(indicador, anterior)}
            </>
          )}
        </div>

        <span className="hidden text-tinta-3 md:block" aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
}
