"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACE =
  "inline-flex min-h-11 items-center text-tinta-2 no-underline";
const ACTUAL = "text-tinta shadow-[inset_0_-2px_0_var(--color-marca)]";

export default function NavPrincipal() {
  const ruta = usePathname();
  const enInicio = ruta === "/" || ruta.startsWith("/indicador");
  const enApi = ruta.startsWith("/desarrolladores");

  return (
    <nav className="flex gap-4 text-sm sm:gap-6 sm:text-[15px]" aria-label="Principal">
      <Link
        href="/"
        className={`${ENLACE} ${enInicio ? ACTUAL : ""}`}
        aria-current={enInicio ? "page" : undefined}
      >
        Indicadores
      </Link>
      <Link
        href="/desarrolladores"
        className={`${ENLACE} ${enApi ? ACTUAL : ""}`}
        aria-current={enApi ? "page" : undefined}
      >
        API
      </Link>
      <a href="https://sdd.bccr.fi.cr" className={`${ENLACE} max-sm:hidden`}>
        Fuente: BCCR
      </a>
    </nav>
  );
}
