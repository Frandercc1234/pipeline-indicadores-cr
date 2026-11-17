import Esqueleto from "@/components/Esqueleto";
import { ENVOLTURA } from "@/components/botones";

/** Estado "cargando" del inicio: bloques del mismo tamaño que el tipo de cambio y el gráfico. */
export default function Cargando() {
  return (
    <main className={`${ENVOLTURA} pt-8 pb-16 sm:pt-12`} aria-busy="true">
      <p className="sr-only">Cargando el tipo de cambio</p>
      <Esqueleto className="h-3.5 w-[min(420px,80%)]" />
      <div className="mt-4 flex flex-wrap items-end gap-8">
        <Esqueleto className="h-24 w-[min(300px,70%)]" />
        <Esqueleto className="h-11 w-[150px]" />
      </div>
      <Esqueleto className="mt-6 h-[200px] sm:h-[340px]" />
    </main>
  );
}
