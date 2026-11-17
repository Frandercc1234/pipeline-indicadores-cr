import { COLOR } from "@/lib/colores";

/**
 * Roseta guilloché: curvas propias generadas por código (no copiadas de ningún billete).
 * Solo se dibuja detrás del tipo de cambio del inicio.
 */
const ANILLOS = [
  { radio: 240, amplitud: 46, lobulos: 9, vueltas: 18, trazo: COLOR.trama, opacidad: 0.9 },
  { radio: 150, amplitud: 30, lobulos: 13, vueltas: 14, trazo: COLOR.trama, opacidad: 0.7 },
  { radio: 70, amplitud: 18, lobulos: 7, vueltas: 10, trazo: COLOR.marca, opacidad: 0.18 },
];

function curva(
  radio: number,
  amplitud: number,
  lobulos: number,
  vuelta: number,
  vueltas: number,
): string {
  const fase = ((vuelta / vueltas) * Math.PI * 2) / lobulos;
  let d = "";
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 2;
    const r =
      radio +
      amplitud * Math.sin(lobulos * t + fase * lobulos) +
      amplitud * 0.35 * Math.sin((lobulos * 2 + 1) * t);
    d += `${i === 0 ? "M" : "L"}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  }
  return `${d}Z`;
}

const CURVAS = ANILLOS.flatMap((anillo) =>
  Array.from({ length: anillo.vueltas }, (_, vuelta) => ({
    d: curva(anillo.radio, anillo.amplitud, anillo.lobulos, vuelta, anillo.vueltas),
    trazo: anillo.trazo,
    opacidad: anillo.opacidad,
  })),
);

export default function Roseta() {
  return (
    <svg
      className="pointer-events-none absolute -top-[90px] -right-[170px] size-[380px] sm:-top-[120px] sm:-right-[140px] sm:size-[620px]"
      viewBox="-310 -310 620 620"
      aria-hidden="true"
    >
      {CURVAS.map((curva, i) => (
        <path
          key={i}
          d={curva.d}
          fill="none"
          stroke={curva.trazo}
          strokeWidth={0.8}
          opacity={curva.opacidad}
        />
      ))}
    </svg>
  );
}
