import type { Indicador } from "@/lib/api";
import { diaYNumero } from "@/lib/formato";
import { calcularCambio, FLECHA } from "@/lib/indicadores";
import Cifra from "./Cifra";

/** Venta o compra del inicio: cifra, y cambio respecto al dato anterior (flecha y texto en tinta). */
export default function CifraTipoCambio({
  etiqueta,
  punto,
  indicador,
  grande,
}: {
  etiqueta: string;
  /** Clase de color del punto: bg-serie-venta o bg-serie-compra. */
  punto: string;
  indicador: Indicador;
  grande: boolean;
}) {
  const { ultimo, anterior } = indicador;
  if (!ultimo) return null;
  const cambio = anterior ? calcularCambio("colones", ultimo, anterior) : null;

  return (
    <div className="flex flex-col" data-indicador={indicador.slug}>
      <span className="flex items-center gap-2 text-[15px] text-tinta-2">
        <span className={`size-2.5 flex-none rounded-full ${punto}`} aria-hidden="true" />
        {etiqueta}
      </span>
      <span
        className={
          grande
            ? "mt-2 font-display text-[clamp(64px,11vw,132px)] leading-[0.9] font-bold tracking-[-0.02em] ancho-88"
            : "mt-2 font-display text-4xl leading-none tracking-[-0.01em] [font-weight:650] ancho-90 sm:text-[44px]"
        }
      >
        <Cifra tipo="colones" valor={ultimo.valor} />
      </span>
      {cambio && anterior ? (
        <span className="mt-2 flex items-baseline gap-1.5 text-[15px] text-tinta-2">
          {cambio.direccion === "igual" ? (
            <>
              <b className="font-semibold text-tinta">Sin cambio</b> respecto al{" "}
              {diaYNumero(anterior.fecha)}
            </>
          ) : (
            <>
              <span aria-hidden="true">{FLECHA[cambio.direccion]}</span>
              <span className="sr-only">{cambio.direccion === "sube" ? "Sube " : "Baja "}</span>
              <b className="font-semibold text-tinta">{cambio.monto}</b> respecto al{" "}
              {diaYNumero(anterior.fecha)}
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}
