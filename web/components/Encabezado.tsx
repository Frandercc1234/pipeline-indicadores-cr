import Link from "next/link";
import { ENVOLTURA } from "./botones";
import NavPrincipal from "./NavPrincipal";

export default function Encabezado() {
  return (
    <header className="border-b border-trama bg-papel">
      <div className={`${ENVOLTURA} flex min-h-16 items-center justify-between gap-4`}>
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-display text-xl leading-none font-bold tracking-[-0.01em] text-tinta no-underline ancho-85"
        >
          <svg
            className="flex-none"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            <circle cx="13" cy="13" r="12" className="fill-none stroke-tinta" strokeWidth="1.5" />
            <path
              d="M5 15c3-6 5-6 8 0s5 6 8 0"
              className="fill-none stroke-marca"
              strokeWidth="1.5"
            />
            <path
              d="M5 11c3 6 5 6 8 0s5-6 8 0"
              className="fill-none stroke-tinta"
              strokeWidth="1.5"
            />
          </svg>
          Indicadores CR
        </Link>
        <NavPrincipal />
      </div>
    </header>
  );
}
