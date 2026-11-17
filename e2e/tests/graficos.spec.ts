import { expect, test } from "@playwright/test";

const LARGO_MINIMO_D = 50;

async function trazo(page: import("@playwright/test").Page): Promise<string> {
  const curva = page.locator(".recharts-line-curve").first();
  await curva.waitFor();
  return (await curva.getAttribute("d")) ?? "";
}

test("el inicio dibuja el gráfico del tipo de cambio", async ({ page }) => {
  await page.goto("/");
  expect((await trazo(page)).length).toBeGreaterThan(LARGO_MINIMO_D);
});

test("el detalle dibuja la serie y cambia al elegir 5 años", async ({ page }) => {
  await page.goto("/indicador/tc_venta");
  const antes = await trazo(page);
  expect(antes.length).toBeGreaterThan(LARGO_MINIMO_D);

  await page.getByRole("group", { name: "Rango del gráfico" }).getByRole("button", { name: "5 años" }).click();
  await expect(
    page.getByRole("button", { name: "5 años" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => trazo(page)).not.toBe(antes);
  expect((await trazo(page)).length).toBeGreaterThan(LARGO_MINIMO_D);
});
