/** Clases de los botones del diseño (objetivo táctil de 44 px como mínimo). */
const BASE =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-tinta px-3.5 py-2.5 text-sm leading-none font-semibold no-underline";

export const BOTON = `${BASE} bg-tinta text-white`;
export const BOTON_SECUNDARIO = `${BASE} bg-transparent text-tinta`;

/** Contenedor centrado del contenido, con el ancho del diseño. */
export const ENVOLTURA =
  "mx-auto w-full max-w-[calc(var(--container-contenido)+3rem)] px-4 sm:px-6";
