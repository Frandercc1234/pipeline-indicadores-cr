import { BOTON, BOTON_SECUNDARIO, ENVOLTURA } from "./botones";

/** Pantalla de error del diseño: "No pudimos cargar los indicadores" con Reintentar. */
export default function EstadoError({ reintentar }: { reintentar: () => void }) {
  return (
    <main className={`${ENVOLTURA} pt-12 pb-16`}>
      <div
        data-panel
        role="alert"
        className="max-w-[640px] rounded-panel border border-trama bg-superficie p-6"
      >
        <h1 className="font-display text-xl leading-tight [font-weight:650] ancho-88">
          No pudimos cargar los indicadores
        </h1>
        <p className="mt-2 max-w-[46ch] text-tinta-2">
          La API no respondió en 90 segundos. Puede estar arrancando después de un rato sin
          uso.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={BOTON} onClick={reintentar}>
            Reintentar
          </button>
          <a className={BOTON_SECUNDARIO} href="https://sdd.bccr.fi.cr">
            Ver en el BCCR
          </a>
        </div>
      </div>
    </main>
  );
}
