"use client";

import EstadoError from "@/components/EstadoError";

// Los errores de la API (caída, timeout) llegan aquí. `retry` vuelve a pedir y dibujar la página.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <EstadoError reintentar={retry} />;
}
