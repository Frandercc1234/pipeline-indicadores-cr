import { expect, test } from "@playwright/test";

const URL_API = process.env.URL_API ?? "http://localhost:3001";

test("GET /indicadores devuelve 6", async ({ request }) => {
  const respuesta = await request.get(`${URL_API}/indicadores`);
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toHaveLength(6);
});

test("GET /salud devuelve 200", async ({ request }) => {
  const respuesta = await request.get(`${URL_API}/salud`);
  expect(respuesta.status()).toBe(200);
});

test("GET /indicadores/no_existe devuelve 404", async ({ request }) => {
  const respuesta = await request.get(`${URL_API}/indicadores/no_existe`);
  expect(respuesta.status()).toBe(404);
});
