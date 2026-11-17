import { conSigno, fechaCorta, numero } from "@/lib/formato";

export interface FilaTabla {
  fecha: string;
  valor: number;
  /** Diferencia con el dato anterior, o null si no hay dato anterior. */
  cambio: number | null;
}

const TH = "border-b-2 border-tinta px-3 py-2 text-sm font-semibold text-tinta-2";
const TD = "border-b border-trama p-3";

/** Alternativa en texto al gráfico: los últimos datos publicados. */
export default function TablaUltimos({
  filas,
  columna,
}: {
  filas: FilaTabla[];
  columna: string;
}) {
  return (
    <div
      role="region"
      aria-label="Últimos 10 datos, desplazable"
      tabIndex={0}
      className="mt-8 overflow-x-auto"
    >
      <table className="w-full min-w-80 border-collapse text-[15px]">
        <caption className="pb-3 text-left font-display text-lg leading-[1.3] [font-weight:650] ancho-90">
          Últimos 10 datos
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${TH} text-left`}>
              Fecha
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {columna}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Cambio
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.fecha}>
              <td className={TD}>{fechaCorta(fila.fecha)}</td>
              <td className={`${TD} text-right tabular-nums`}>{numero(fila.valor)}</td>
              <td className={`${TD} text-right tabular-nums`}>
                {fila.cambio === null ? "n/d" : conSigno(fila.cambio)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
