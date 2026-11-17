import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import Cifra from "@/components/Cifra";
import DetalleGrafico from "@/components/DetalleGrafico";
import TablaUltimos, { type FilaTabla } from "@/components/TablaUltimos";
import { ENVOLTURA } from "@/components/botones";
import {
  NoEncontrado,
  obtenerIndicador,
  obtenerIndicadores,
  obtenerSerie,
  type Indicador,
  type Serie,
} from "@/lib/api";
import { anio, fechaCorta } from "@/lib/formato";
import { mayuscula, nombreDePeriodicidad, textosDe } from "@/lib/indicadores";

// Los 6 slugs se generan al compilar. Cada página se renueva sola cada hora (ISR).
// Si la API no responde, no se prerenderiza ninguna y cada página se genera en su primera visita:
// un error aquí no pasa por error.tsx y dejaría la pantalla en blanco.
export async function generateStaticParams() {
  try {
    const indicadores = await obtenerIndicadores();
    return indicadores.map((indicador) => ({ slug: indicador.slug }));
  } catch {
    return [];
  }
}

async function cargar(slug: string): Promise<{ indicador: Indicador; serie: Serie }> {
  try {
    const [indicador, serie] = await Promise.all([obtenerIndicador(slug), obtenerSerie(slug)]);
    return { indicador, serie };
  } catch (error) {
    if (error instanceof NoEncontrado) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/indicador/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { indicador } = await cargar(slug);
    return { title: `${textosDe(indicador).titulo} | Indicadores CR` };
  } catch (error) {
    // El 404 sigue su camino; si la API falla, el error lo muestra la página (error.tsx).
    unstable_rethrow(error);
    return { title: "Indicadores CR" };
  }
}

export default async function Detalle({ params }: PageProps<"/indicador/[slug]">) {
  const { slug } = await params;
  const { indicador, serie } = await cargar(slug);
  const textos = textosDe(indicador);
  const { ultimo } = indicador;

  // Últimos 10 datos, cada uno con su diferencia respecto al dato anterior.
  const recientes = serie.datos.slice(-11);
  const filas: FilaTabla[] = recientes
    .map((dato, i) => ({
      fecha: dato.fecha,
      valor: dato.valor,
      cambio: i === 0 ? null : dato.valor - recientes[i - 1].valor,
    }))
    .slice(recientes.length > 10 ? 1 : 0)
    .reverse();

  const primera = serie.datos[0]?.fecha;

  return (
    <main className={`${ENVOLTURA} pb-16`}>
      <p className="pt-8 text-sm">
        <Link href="/">Indicadores</Link> <span aria-hidden="true">/</span> {textos.titulo}
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="max-w-[18ch] font-display text-[32px] leading-[1.05] font-bold tracking-[-0.02em] ancho-82 sm:text-[40px]">
            {indicador.nombre}
          </h1>
          <p className="mt-2 text-tinta-2">
            {mayuscula(indicador.unidad)}. {nombreDePeriodicidad(indicador.periodicidad)}
            {primera ? ` desde ${anio(primera)}` : ""}.
          </p>
        </div>
        {ultimo ? (
          <div className="text-left sm:text-right">
            <span className="text-[15px] text-tinta-2">{fechaCorta(ultimo.fecha)}</span>
            <div className="mt-2 font-display text-[44px] leading-none tracking-[-0.01em] [font-weight:650] ancho-90 sm:text-[56px]">
              <Cifra tipo={textos.tipo} valor={ultimo.valor} />
            </div>
          </div>
        ) : null}
      </div>

      <DetalleGrafico
        nombre={textos.titulo}
        tipo={textos.tipo}
        color={textos.color}
        periodicidad={indicador.periodicidad}
        datos={serie.datos.map((d) => [d.fecha, d.valor])}
      />

      <TablaUltimos filas={filas} columna={textos.columna} />

      <p className="mt-4 text-sm text-tinta-2">
        Fuente:{" "}
        <a href="https://sdd.bccr.fi.cr">
          Banco Central de Costa Rica, indicador {indicador.codigoBccr}
        </a>
        .
      </p>
    </main>
  );
}
