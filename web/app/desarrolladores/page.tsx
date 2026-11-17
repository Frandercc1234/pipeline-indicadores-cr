import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BOTON_SECUNDARIO, ENVOLTURA } from "@/components/botones";
import { obtenerIndicador, obtenerIndicadores, type Indicador } from "@/lib/api";

export const metadata: Metadata = {
  title: "API para desarrolladores | Indicadores CR",
  description: "Los mismos datos del tablero, en JSON. API pública de solo lectura.",
};

const CLAVE = "text-codigo-clave";

function Valor({ valor }: { valor: string | number | null }) {
  return <>{typeof valor === "string" ? `"${valor}"` : String(valor)}</>;
}

function Observacion({ dato }: { dato: { fecha: string; valor: number } | null }) {
  if (!dato) return <>null</>;
  return (
    <>
      {"{ "}
      <span className={CLAVE}>&quot;fecha&quot;</span>: <Valor valor={dato.fecha} />,{" "}
      <span className={CLAVE}>&quot;valor&quot;</span>: <Valor valor={dato.valor} />
      {" }"}
    </>
  );
}

/** Respuesta real de la API, con las claves resaltadas. */
function EjemploJson({ indicador }: { indicador: Indicador }) {
  const campos: [string, ReactNode][] = [
    ["slug", <Valor key="s" valor={indicador.slug} />],
    ["codigoBccr", <Valor key="c" valor={indicador.codigoBccr} />],
    ["nombre", <Valor key="n" valor={indicador.nombre} />],
    ["unidad", <Valor key="u" valor={indicador.unidad} />],
    ["ultimo", <Observacion key="l" dato={indicador.ultimo} />],
    ["anterior", <Observacion key="a" dato={indicador.anterior} />],
  ];
  return (
    <>
      {"{\n"}
      {campos.map(([clave, valor], i) => (
        <span key={clave}>
          {"  "}
          <span className={CLAVE}>&quot;{clave}&quot;</span>: {valor}
          {i < campos.length - 1 ? ",\n" : "\n"}
        </span>
      ))}
      {"}"}
    </>
  );
}

const RUTA = "grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-b border-trama py-4";
const METODO =
  "h-max rounded-[4px] bg-marca-suave py-[5px] text-center font-codigo text-xs leading-none font-semibold text-marca";

export default async function Desarrolladores() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "").replace(/\/$/, "");
  const indicadores = await obtenerIndicadores();
  const ejemplo = await obtenerIndicador("tc_venta").catch(() => null);
  const ultima = ejemplo?.ultimo?.fecha;
  const rutaSerie = ultima
    ? `/indicadores/{slug}/serie?desde=${ultima.slice(0, 4)}-01-01&hasta=${ultima}`
    : "/indicadores/{slug}/serie?desde=2026-01-01";

  return (
    <main
      className={`${ENVOLTURA} grid grid-cols-1 gap-8 pt-12 pb-16 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12`}
    >
      <div>
        <h1 className="font-display text-[34px] leading-[1.05] font-bold tracking-[-0.02em] ancho-82 sm:text-[44px]">
          Los mismos datos, en JSON
        </h1>
        <p className="mt-3 max-w-[58ch] text-lg text-tinta-2">
          Una API pública de solo lectura con los seis indicadores desde 2015. No pide registro ni
          clave.
        </p>

        <div
          data-panel
          className="mt-4 flex flex-wrap items-center gap-3 rounded-control border border-trama bg-superficie px-4 py-3"
        >
          <code className="font-codigo text-[15px] leading-[1.4] font-medium break-all">{base}</code>
          <a className={BOTON_SECUNDARIO} href={`${base}/docs`}>
            Abrir Swagger
          </a>
        </div>

        <h2 className="mt-12 font-display text-[22px] leading-tight [font-weight:650] ancho-88">
          Rutas
        </h2>
        <div className="mt-4 border-t-2 border-tinta">
          <div className={RUTA}>
            <span className={METODO}>GET</span>
            <div>
              <code className="font-codigo text-[15px] leading-[1.4] break-words">/indicadores</code>
              <p className="mt-1 text-[15px] text-tinta-2">
                Los seis indicadores con su último dato y el anterior.
              </p>
            </div>
          </div>
          <div className={RUTA}>
            <span className={METODO}>GET</span>
            <div>
              <code className="font-codigo text-[15px] leading-[1.4] break-words">
                /indicadores/{"{slug}"}
              </code>
              <p className="mt-1 text-[15px] text-tinta-2">
                Un indicador. Slugs: {indicadores.map((i) => i.slug).join(", ")}.
              </p>
            </div>
          </div>
          <div className={RUTA}>
            <span className={METODO}>GET</span>
            <div>
              <code className="font-codigo text-[15px] leading-[1.4] break-words">{rutaSerie}</code>
              <p className="mt-1 text-[15px] text-tinta-2">
                La serie entre dos fechas, en orden. Sin fechas, devuelve todo desde 2015 hasta el
                último dato.
              </p>
            </div>
          </div>
          <div className={RUTA}>
            <span className={METODO}>GET</span>
            <div>
              <code className="font-codigo text-[15px] leading-[1.4] break-words">/salud</code>
              <p className="mt-1 text-[15px] text-tinta-2">
                Estado de la base y hora de la última carga.
              </p>
            </div>
          </div>
        </div>

        <h2 className="mt-12 font-display text-[22px] leading-tight [font-weight:650] ancho-88">
          Ejemplo
        </h2>
        <pre className="-mx-4 mt-4 overflow-x-auto bg-codigo-fondo p-4 font-codigo text-[13px] leading-[1.6] text-codigo-texto sm:mx-0 sm:rounded-control sm:px-6 sm:text-sm">
          <code>
            <span className="text-codigo-comentario"># Último tipo de cambio de venta</span>
            {`\ncurl ${base}/indicadores/tc_venta\n\n`}
            {ejemplo ? (
              <EjemploJson indicador={ejemplo} />
            ) : (
              <span className="text-codigo-comentario">
                # No pudimos obtener un ejemplo en este momento.
              </span>
            )}
          </code>
        </pre>

        <div
          data-panel
          className="mt-6 rounded-control border border-trama bg-superficie p-4 text-[15px]"
        >
          <strong>La primera consulta puede tardar.</strong> La API corre en un plan gratuito que se
          suspende sin tráfico. Si tarda más de un minuto, volvé a intentar.
        </div>
      </div>

      <aside
        className="self-start border-l-2 border-tinta pl-6 text-[15px] md:sticky md:top-20"
        aria-label="Datos de la API"
      >
        <dl>
          <dt className="text-sm text-tinta-3">Límite</dt>
          <dd className="font-semibold">60 consultas por minuto por IP</dd>
          <dt className="mt-4 text-sm text-tinta-3">Formato</dt>
          <dd className="font-semibold">JSON, fechas YYYY-MM-DD</dd>
          <dt className="mt-4 text-sm text-tinta-3">Actualización</dt>
          <dd className="font-semibold">06:15 y 18:15, hora de Costa Rica</dd>
          <dt className="mt-4 text-sm text-tinta-3">Historial</dt>
          <dd className="font-semibold">Desde el 1 de enero de 2015</dd>
          <dt className="mt-4 text-sm text-tinta-3">Fuente</dt>
          <dd className="font-semibold">
            <a href="https://sdd.bccr.fi.cr">Banco Central de Costa Rica</a>
          </dd>
        </dl>
      </aside>
    </main>
  );
}
