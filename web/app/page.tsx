import Link from "next/link";
import CifraTipoCambio from "@/components/CifraTipoCambio";
import EstadoVacio from "@/components/EstadoVacio";
import FilaIndicador from "@/components/FilaIndicador";
import GraficoSerie from "@/components/GraficoSerie";
import RosetaDecorativa from "@/components/RosetaDecorativa";
import { ENVOLTURA } from "@/components/botones";
import {
  ApiError,
  obtenerIndicadores,
  obtenerSerie,
  type Indicador,
  type Observacion,
} from "@/lib/api";
import { colones, fechaCorta, fechaLarga } from "@/lib/formato";
import { reducir, restarMeses } from "@/lib/series";

/** Indicadores que van como filas del libro, en este orden. */
const LIBRO = ["ipc_interanual", "ipc_indice", "tbp", "tpm"];

/** Serie de los últimos 12 meses desde el último dato publicado. */
async function ultimos12Meses(indicador: Indicador | undefined): Promise<Observacion[]> {
  if (!indicador?.ultimo) return [];
  const serie = await obtenerSerie(indicador.slug, restarMeses(indicador.ultimo.fecha, 12));
  return serie.datos;
}

function resumenDelAnio(datos: Observacion[]): string {
  if (datos.length < 2) return "";
  const primero = datos[0];
  const ultimo = datos[datos.length - 1];
  const diferencia = ultimo.valor - primero.valor;
  const verbo = Math.abs(diferencia) < 0.005 ? "Se mantuvo" : diferencia < 0 ? "Bajó" : "Subió";
  return `${verbo} de ${colones(primero.valor)} (venta, ${fechaCorta(primero.fecha)}) a ${colones(ultimo.valor)} en un año.`;
}

export default async function Inicio() {
  const indicadores = await obtenerIndicadores();
  const venta = indicadores.find((i) => i.slug === "tc_venta");
  const compra = indicadores.find((i) => i.slug === "tc_compra");
  if (!venta || !compra) {
    throw new ApiError("La API no devolvió el tipo de cambio");
  }
  const libro = LIBRO.map((slug) => indicadores.find((i) => i.slug === slug)).filter(
    (i): i is Indicador => i !== undefined,
  );

  const [serieVenta, serieCompra, ...historiales] = await Promise.all([
    ultimos12Meses(venta),
    ultimos12Meses(compra),
    ...libro.map((indicador) => ultimos12Meses(indicador)),
  ]);

  if (!venta.ultimo || !compra.ultimo) {
    return (
      <main className={`${ENVOLTURA} pt-12 pb-16`}>
        <EstadoVacio
          titulo="Sin datos publicados"
          texto="Todavía no hay un tipo de cambio de referencia para mostrar."
        />
      </main>
    );
  }

  return (
    <main>
      <section className="relative overflow-hidden pt-8 pb-8 sm:pt-12" aria-labelledby="hero-titulo">
        <RosetaDecorativa />
        <div className={`${ENVOLTURA} relative`}>
          <h1 id="hero-titulo" className="text-[15px] leading-[1.4] font-semibold text-tinta-2">
            Tipo de cambio de referencia del dólar, {fechaLarga(venta.ultimo.fecha)}
          </h1>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4 sm:gap-x-12 sm:gap-y-6">
            <CifraTipoCambio etiqueta="Venta" punto="bg-serie-venta" indicador={venta} grande />
            <CifraTipoCambio
              etiqueta="Compra"
              punto="bg-serie-compra"
              indicador={compra}
              grande={false}
            />
          </div>

          <figure
            data-panel
            className="mt-8 -mx-2 rounded-panel border border-trama bg-superficie px-3 pt-4 pb-3 sm:mx-0 sm:px-6 sm:pt-6 sm:pb-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-lg leading-[1.3] [font-weight:650] ancho-90">
                Último año
              </h2>
              <div className="flex gap-4 text-sm text-tinta-2" aria-hidden="true">
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block h-0.5 w-4 rounded-[1px] bg-serie-venta" />
                  Venta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block h-0.5 w-4 rounded-[1px] bg-serie-compra" />
                  Compra
                </span>
              </div>
            </div>
            <GraficoSerie
              tipo="colones"
              ariaLabel="Tipo de cambio de venta y de compra, último año"
              series={[
                {
                  clave: "venta",
                  nombre: "Venta",
                  color: "venta",
                  etiqueta: "principal",
                  datos: serieVenta,
                },
                {
                  clave: "compra",
                  nombre: "Compra",
                  color: "compra",
                  etiqueta: "secundaria",
                  datos: serieCompra,
                },
              ]}
            />
            <figcaption className="mt-3 flex flex-wrap justify-between gap-4 text-[13px] text-tinta-3">
              <span>{resumenDelAnio(serieVenta)}</span>
              <Link href="/indicador/tc_venta">Ver tabla y otros rangos</Link>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="pt-8 pb-16" aria-labelledby="libro-titulo">
        <div className={ENVOLTURA}>
          <h2
            id="libro-titulo"
            className="font-display text-2xl leading-[1.2] tracking-[-0.01em] [font-weight:650] ancho-85"
          >
            Inflación y tasas de interés
          </h2>
          <p className="mt-1 max-w-[60ch] text-tinta-2">
            Último dato publicado por el BCCR y su cambio respecto al dato anterior.
          </p>
          <ul className="mt-6 border-t-2 border-tinta">
            {libro.map((indicador, i) => {
              const mensual = indicador.periodicidad === "mensual";
              return (
                <FilaIndicador
                  key={indicador.slug}
                  indicador={indicador}
                  historial={reducir(historiales[i], 26).map((d) => d.valor)}
                  rotuloHistorial={mensual ? "Últimos 12 meses" : "Último año"}
                />
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
