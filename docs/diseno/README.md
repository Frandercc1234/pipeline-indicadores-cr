# Diseño: Indicadores CR

Estado: **aprobado por Frander (17 de noviembre de 2026).** Manda sobre cualquier otra cosa.

## Archivos

- `maqueta.html`: maqueta navegable. Se abre en el navegador; las pantallas están en la barra amarilla de arriba (esa barra no es parte del diseño).
- `tokens.json`: colores, tipografía, espaciado, radios y reglas. **Manda sobre la sección 10 del blueprint.**
- `capturas/`: inicio, detalle, desarrolladores y estados a 375 y 1280 px.

La maqueta va en HTML porque la cuota del MCP de Figma (plan Starter) se agotó al empezar. Las instrucciones del proyecto prevén ese caso.

Las capturas se generaron con Playwright en un entorno sin acceso a Google Fonts, así que muestran fuentes de reemplazo. La revisión visual con las fuentes reales se hizo en Chrome a 1280 px.

## Concepto

"Papel de seguridad": el lenguaje visual de los documentos de valor, sin copiar billetes ni la identidad del BCCR.

- La pieza que se recuerda es una roseta guilloché generada por código (curvas propias), detrás del tipo de cambio del inicio. No se repite en otra parte.
- Los datos no opinan: subir o bajar no se pinta de verde o rojo.
- Los indicadores secundarios van como filas de un libro contable con minigráfico, no como tarjetas iguales.

## Para construir (paso 14)

- Fuentes con `next/font/google`: Bricolage Grotesque (variable, ejes `opsz` y `wdth`), Schibsted Grotesk y JetBrains Mono (solo código).
- Tokens a `@theme` de Tailwind 4 con los nombres de `tokens.json` (`--color-papel`, `--color-tinta`, etc.).
- Gráficos con Recharts: `ResponsiveContainer`, líneas de 2 px, sin puntos, rejilla horizontal `trama-suave`, etiqueta directa del último valor fuera del área de trazado, tooltip con mira vertical al pasar el mouse o tocar.
- Eje X: 5 fechas en escritorio, 3 en móvil (`nov 2025`, `may`, `nov 2026`).
- Cifras tabulares (`tabular-nums`) solo en celdas numéricas y en el eje Y.
- Objetivos táctiles de 44 px como mínimo.
- La animación de entrada del trazo respeta `prefers-reduced-motion`.

## Revisión hecha

- Playwright: sin desborde horizontal en 12 vistas (6 pantallas × 375 y 1280), sin errores de consola, orden de tabulación lógico y foco visible.
- Contraste WCAG AA: texto 14,83:1, secundario 6,62:1, tinta-3 5,02:1, enlaces 6,22:1, borde de control 3,09:1.
- Par venta/compra validado con la skill dataviz: ΔE 12,1 en protanopía, 27,7 en visión normal.
- Todas las cifras de la maqueta salen de la API en producción el 16 nov 2026 y coinciden con sdd.bccr.fi.cr.
