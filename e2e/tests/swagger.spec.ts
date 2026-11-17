import { expect, test } from "@playwright/test";

const URL_API = process.env.URL_API ?? "http://localhost:3001";

test("Swagger muestra el título de la API", async ({ page }) => {
  await page.goto(`${URL_API}/docs`);
  await expect(page.getByText("API de indicadores económicos de Costa Rica").first()).toBeVisible();
});

test("la especificación OpenAPI tiene las rutas públicas", async ({ request }) => {
  const respuesta = await request.get(`${URL_API}/docs-json`);
  expect(respuesta.status()).toBe(200);
  const { paths } = await respuesta.json();
  for (const ruta of ["/indicadores", "/indicadores/{slug}/serie", "/salud"]) {
    expect(Object.keys(paths), `falta ${ruta}`).toContain(ruta);
  }
});
