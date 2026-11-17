import Link from "next/link";
import { BOTON, ENVOLTURA } from "@/components/botones";

export default function NoExiste() {
  return (
    <main className={`${ENVOLTURA} py-16`}>
      <span
        aria-hidden="true"
        className="block font-display text-[clamp(64px,11vw,132px)] leading-[0.9] font-bold tracking-[-0.02em] text-trama ancho-88"
      >
        404
      </span>
      <h1 className="mt-4 font-display text-4xl leading-[1.1] font-bold ancho-82">
        Esta página no existe
      </h1>
      <p className="mt-2 text-tinta-2">
        Puede que el enlace esté mal escrito o que el indicador haya cambiado de nombre.
      </p>
      <p className="mt-6">
        <Link href="/" className={BOTON}>
          Ir a los indicadores
        </Link>
      </p>
    </main>
  );
}
