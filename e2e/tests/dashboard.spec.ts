import { expect, test } from "@playwright/test";

test("el inicio responde 200 y muestra las 6 tarjetas, cada una con un número", async ({ page }) => {
  const respuesta = await page.goto("/");
  expect(respuesta?.status()).toBe(200);

  const tarjetas = page.locator("[data-indicador]");
  await expect(tarjetas).toHaveCount(6);
  for (const tarjeta of await tarjetas.all()) {
    await expect(tarjeta).toContainText(/\d/);
    // Una cifra con formato es-CR: dígitos con separador de miles o coma decimal.
    await expect(tarjeta).toContainText(/\d+(?:[.\s\u00a0]\d{3})*(?:,\d+)?/);
  }
});
