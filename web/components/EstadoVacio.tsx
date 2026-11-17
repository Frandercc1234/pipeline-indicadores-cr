import type { ReactNode } from "react";

/** Mensaje de "sin datos" del diseño: título, explicación y, opcional, una acción. */
export default function EstadoVacio({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-panel
      className="rounded-panel border border-trama bg-superficie p-6"
    >
      <h2 className="font-display text-xl leading-tight [font-weight:650] ancho-88">
        {titulo}
      </h2>
      <p className="mt-2 max-w-[46ch] text-tinta-2">{texto}</p>
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
