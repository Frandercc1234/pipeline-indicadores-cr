"use client";

import dynamic from "next/dynamic";

// Son unas 30.000 coordenadas: se dibuja en el navegador y no pesa en el HTML. Es decorativa.
const Roseta = dynamic(() => import("./Roseta"), { ssr: false });

export default function RosetaDecorativa() {
  return <Roseta />;
}
