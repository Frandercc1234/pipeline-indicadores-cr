import { expect, test } from "@playwright/test";

const ANCHOS = [375, 768, 1000, 1280];
const RUTAS = ["/", "/indicador/tc_venta", "/desarrolladores", "/no-existe"];
const RUTAS_CON_GRAFICO = ["/", "/indicador/tc_venta"];
const MARGEN_MINIMO_PX = 8;

// Esta prueba trae sus propios anchos y su propia emulación de dispositivo:
// corre una sola vez, en el proyecto de escritorio.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "usa sus propios anchos");
});

for (const ancho of ANCHOS) {
  for (const ruta of RUTAS) {
    test.describe(`${ruta} a ${ancho} px`, () => {
      // Por debajo de 768 px se emula un teléfono; así el navegador no ensancha la ventana
      // para que quepa un desborde y la medición es honesta.
      const movil = ancho < 768;

      test("no se desborda en horizontal", async ({ browser }) => {
        const contexto = await browser.newContext({
          viewport: { width: ancho, height: 800 },
          isMobile: movil,
          hasTouch: movil,
        });
        const page = await contexto.newPage();
        const medir = () =>
          page.evaluate(() => ({
            ventana: window.innerWidth,
            contenido: document.documentElement.scrollWidth,
          }));

        // Antes de que React hidrate: el SVG del servidor mide 1000 px hasta que se mide el contenedor.
        await page.goto(ruta, { waitUntil: "domcontentloaded" });
        const antes = await medir();
        expect(antes.ventana, "el navegador no debe ensanchar la ventana").toBe(ancho);
        expect(antes.contenido, "antes de hidratar").toBeLessThanOrEqual(ancho);

        await page.waitForLoadState("networkidle");
        if (RUTAS_CON_GRAFICO.includes(ruta)) {
          await page.locator(".recharts-line-curve").first().waitFor();
        }
        const despues = await medir();
        expect(despues.ventana).toBe(ancho);
        expect(despues.contenido, "después de hidratar").toBeLessThanOrEqual(ancho);
        await contexto.close();
      });

      test(`ningún panel, tabla o título empieza a menos de ${MARGEN_MINIMO_PX} px del borde izquierdo`, async ({
        browser,
      }) => {
        const contexto = await browser.newContext({
          viewport: { width: ancho, height: 800 },
          isMobile: movil,
          hasTouch: movil,
        });
        const page = await contexto.newPage();
        await page.goto(ruta);
        await page.waitForLoadState("networkidle");

        // Paneles (data-panel), tablas y títulos (h1 y h2) que se ven en pantalla.
        const bordes = await page.locator("h1, h2, table, [data-panel]").evaluateAll((elementos) =>
          elementos
            .filter((e) => e.getClientRects().length > 0)
            .map((e) => ({
              elemento:
                e.tagName.toLowerCase() + (e.hasAttribute("data-panel") ? "[data-panel]" : ""),
              texto: (e.textContent ?? "").trim().slice(0, 30),
              izquierda: Math.round(e.getBoundingClientRect().left * 10) / 10,
            })),
        );

        expect(bordes.length, "la página tiene al menos un título").toBeGreaterThan(0);
        const pegados = bordes.filter((b) => b.izquierda < MARGEN_MINIMO_PX);
        expect(pegados, "elementos a menos de 8 px del borde izquierdo").toEqual([]);
        await contexto.close();
      });
    });
  }
}
