/** Bloque de carga con el brillo del diseño (se detiene con prefers-reduced-motion). */
export default function Esqueleto({ className }: { className: string }) {
  return <div className={`esqueleto ${className}`} aria-hidden="true" />;
}
