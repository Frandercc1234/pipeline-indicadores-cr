import { numero } from "@/lib/formato";
import type { TipoValor } from "@/lib/indicadores";

/**
 * Cifra con su símbolo: ₡ antes del número, % después. El símbolo va más liviano y en tinta-2.
 * `simbolo` son las clases del símbolo (por ejemplo, el tamaño en las filas).
 */
export default function Cifra({
  tipo,
  valor,
  simbolo = "",
}: {
  tipo: TipoValor;
  valor: number;
  simbolo?: string;
}) {
  if (tipo === "colones") {
    return (
      <>
        <span className={`mr-[0.04em] font-medium text-tinta-2 ${simbolo}`}>₡</span>
        {numero(valor)}
      </>
    );
  }
  if (tipo === "porcentaje") {
    return (
      <>
        {numero(valor)}
        <small className={`ml-0.5 font-medium text-tinta-2 ${simbolo || "text-[18px]"}`}>%</small>
      </>
    );
  }
  return <>{numero(valor)}</>;
}
