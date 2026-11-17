import { obtenerSalud } from "@/lib/api";
import { fechaHoraCostaRica } from "@/lib/formato";
import { ENVOLTURA } from "./botones";

/** Pie de todas las páginas. La hora de la última carga viene de /salud (si responde). */
export default async function Pie() {
  const salud = await obtenerSalud();
  const fin = salud?.ultimaCarga?.fin;

  return (
    <footer className="mt-auto border-t border-trama pt-6 pb-12 text-sm text-tinta-2">
      <div className={`${ENVOLTURA} flex flex-wrap justify-between gap-4`}>
        <p>
          Datos del Banco Central de Costa Rica. Se actualizan a las 06:15 y a las 18:15.
          {fin ? ` Última carga: ${fechaHoraCostaRica(fin)}.` : ""}
        </p>
        <p>
          Proyecto de{" "}
          <a href="https://github.com/Frandercc1234">Frander Centeno</a>.{" "}
          <a href="https://github.com/Frandercc1234/pipeline-indicadores-cr">Código</a>
        </p>
      </div>
    </footer>
  );
}
