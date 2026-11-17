import Esqueleto from "@/components/Esqueleto";
import { ENVOLTURA } from "@/components/botones";

/** Estado "cargando" del detalle. */
export default function CargandoDetalle() {
  return (
    <main className={`${ENVOLTURA} pt-8 pb-16`} aria-busy="true">
      <p className="sr-only">Cargando el indicador</p>
      <Esqueleto className="h-3.5 w-[min(220px,60%)]" />
      <Esqueleto className="mt-6 h-12 w-[min(420px,90%)]" />
      <Esqueleto className="mt-8 h-[240px] sm:h-[380px]" />
      <Esqueleto className="mt-8 h-[220px]" />
    </main>
  );
}
