# Blueprint: pipeline-indicadores-cr

Pipeline diario de indicadores económicos del Banco Central de Costa Rica (BCCR), con API pública y dashboard.

Este archivo es el `CLAUDE.md` del repo. Todo lo necesario para construir el proyecto está aquí. Si algo no está, se pregunta a Frander antes de inventarlo.

---

## 1. Resumen

**Qué es.** Un proceso que corre solo dos veces al día. Baja seis indicadores de la API SDDE del BCCR, los valida, los guarda en PostgreSQL y los expone en una API NestJS de solo lectura y en un dashboard Next.js.

**Para quién.** Para el portafolio de Frander Centeno, desarrollador fullstack y de datos en Costa Rica. Le sirve a quien necesite el tipo de cambio, la inflación o las tasas de referencia en un formato limpio y consultable. Puede ser una persona curiosa o un desarrollador que quiere los datos en JSON.

**Problema que resuelve.** El BCCR publica los datos, pero consumirlos pide registro, token y manejo de formatos. Este proyecto los deja listos, validados contra la fuente y con historial desde 2015. Además, demuestra CI/CD, Docker, un backend Node desplegado y un proceso de datos que corre sin intervención.

---

## 2. Alcance

### MVP

1. Carga histórica (backfill) desde el 2015-01-01 de seis indicadores:

   | slug | Indicador | Código BCCR |
   |---|---|---|
   | `tc_compra` | Tipo de cambio de referencia, compra | 317 |
   | `tc_venta` | Tipo de cambio de referencia, venta | 318 |
   | `ipc_indice` | Índice de precios al consumidor (nivel), base junio 2026 = 100 | 98404 |
   | `ipc_interanual` | Variación interanual del IPC | 98407 |
   | `tbp` | Tasa básica pasiva (diaria) | 423 |
   | `tpm` | Tasa de política monetaria | 3541 |

2. Carga diaria a las 06:15 y a las 18:15 (hora de Costa Rica). Usa reintentos, registra cada corrida y abre un issue en GitHub si falla.
3. Validación de los datos antes de guardar: rangos, fechas, duplicados y sin rellenar huecos. Después de guardar, se comparan los datos contra lo que publica el BCCR.
4. Modo simulado (`BCCR_MODO=simulado`) que lee fixtures reales capturados una vez. CI nunca llama al BCCR.
5. API NestJS pública de solo lectura con Swagger en `/docs` y límite de peticiones por IP.
6. Dashboard Next.js con el resumen, el detalle por indicador y una página para desarrolladores.
7. Pruebas: unitarias (Python y NestJS), de datos (SQL sobre la base) y e2e con Playwright a 375 px y 1280 px.
8. CI en cada push, pruebas contra producción después de cada deploy y vigilancia programada que además evita que Render se duerma.

### Fuera de alcance

- Login, usuarios, favoritos o alertas por correo a terceros.
- Escribir datos por la API (no hay POST, PUT ni DELETE).
- Otros indicadores fuera de los seis de la tabla.
- Pronósticos, cálculos propios sobre los datos (por ejemplo, calcular la inflación a partir del índice) o conversión de monedas.
- Modo oscuro, internacionalización y PWA.
- AWS, Azure o cualquier servicio que pida tarjeta.

---

## 3. Usuarios y roles

No hay usuarios con cuenta. Los "roles" son de la base de datos y de la operación.

| Actor | Qué puede hacer | Cómo |
|---|---|---|
| Visitante | Ver el dashboard | Vercel, sin login |
| Desarrollador externo | Leer la API (`GET`) | Sin clave, 60 peticiones por minuto por IP |
| ETL (GitHub Actions) | Insertar y actualizar `observacion`, `carga` y `revision` | Rol de Postgres `etl_writer` |
| API (Render) | Solo `SELECT` | Rol de Postgres `api_reader` |
| Migraciones | Crear y alterar tablas, sembrar `indicador` | Rol dueño de Neon, solo desde el workflow `migrar.yml` o en local |
| Frander | Administrar Neon, Render, Vercel y GitHub | Sus cuentas |

---

## 4. Stack

**Regla de versiones.** La columna "Versión" fija la versión mayor. En el paso 1, el constructor instala la última estable de esa mayor y la fija **exacta**: `npm install --save-exact`, `package-lock.json` versionado, `==` en `requirements.txt` y tags exactos en las imágenes Docker (nunca `latest`). Después anota las versiones resueltas en `docs/versiones.md`. Ninguna dependencia se actualiza sin pasar CI y las pruebas contra producción.

| Pieza | Tecnología | Versión | Por qué |
|---|---|---|---|
| Lenguaje ETL | Python | 3.12.x | Estable y conocido. Imagen `python:3.12-slim`. |
| HTTP ETL | httpx | 0.28.x | Cliente con timeouts y fácil de simular en tests. |
| Reintentos | tenacity | 9.x | Reintentos con espera exponencial sin código propio. |
| Datos | pandas | 2.x | Limpieza y comparación de series. |
| Driver Postgres (Python) | psycopg (binary) | 3.2.x | Driver oficial moderno. |
| Config YAML | PyYAML | 6.x | Lee `indicadores.yaml`. |
| Tests Python | pytest, respx | 8.x, 0.22.x | pytest para unitarias y de datos, respx para simular httpx. |
| Lint Python | ruff | 0.x (fijar exacta) | Lint y formato en una sola herramienta. |
| Base | PostgreSQL en Neon | 17 | Gratis permanente, sin tarjeta, 1 GB por proyecto. |
| Postgres local | Imagen `postgres:17-alpine` | 17 | Igual a producción. |
| Runtime API | Node.js | 24 LTS | LTS vigente. Imagen `node:24-alpine`. |
| API | NestJS | 11 | Backend Node que piden las vacantes. Frander ya lo usa. |
| Driver Postgres (Node) | pg | 8.x | SQL plano. Un ORM sobra para 3 tablas de lectura. |
| Docs API | @nestjs/swagger | 11 | Swagger en `/docs`. |
| Límite de peticiones | @nestjs/throttler | 6.x | 60 peticiones por minuto por IP. |
| Validación API | class-validator, class-transformer | 0.14.x, 0.5.x | DTOs de query. |
| Tests API | Jest, supertest | Los que trae NestJS 11 | Estándar de NestJS. |
| Web | Next.js (App Router) | 16 | Stack de Frander. ISR evita esperar a Render. |
| UI | React | 19 | La que pide Next 16. |
| Estilos | Tailwind CSS | 4 | Stack de Frander. |
| Gráficos | Recharts | 3.x | Líneas simples y responsive. |
| E2E | @playwright/test | 1.x (última estable, exacta) | Pruebas en local y en producción. |
| Contenedores | Docker + docker compose | Docker 27+ | Entorno local igual al de CI. Imagen de la API para Render. |
| CI/CD y cron | GitHub Actions | n/a | Gratis en repo público. |
| Hosting API | Render, plan Free (web service Docker) | n/a | Sin tarjeta, 750 horas al mes. |
| Hosting web | Vercel, plan Hobby | n/a | Sin tarjeta. Funciona nativo con Next.js. |
| Secretos en CI | gitleaks-action | v2 | Bloquea commits con claves. |

---

## 5. Estructura de carpetas

```
pipeline-indicadores-cr/
├── CLAUDE.md                  # Este blueprint
├── README.md                  # Presentación del proyecto, diagrama y cómo correrlo
├── .gitignore                 # Ignora .env*, node_modules, .venv, .next, test-results
├── .env.example               # Todas las variables, sin valores reales
├── docker-compose.yml         # db, api y etl (perfil "etl") para desarrollo local
├── docs/
│   ├── versiones.md           # Versiones exactas resueltas en el paso 1
│   ├── diseno/                # Enlace a Figma, tokens.json y capturas aprobadas
│   └── validacion-manual.md   # Comparación manual contra sdd.bccr.fi.cr (paso 6)
├── db/
│   ├── migrations/            # SQL versionado: 001_esquema.sql, 002_permisos.sql, 003_dias_adelanto.sql
│   └── local/                 # init-roles.sh: crea etl_writer y api_reader en el Postgres local
├── etl/
│   ├── pyproject.toml         # Config de ruff y pytest
│   ├── requirements.txt       # Dependencias de producción con ==
│   ├── requirements-dev.txt   # pytest, respx y ruff con ==
│   ├── Dockerfile             # Imagen del ETL para compose
│   ├── indicadores.yaml       # Los 6 indicadores: slug, código, nombre, unidad, periodicidad y rango
│   ├── etl/
│   │   ├── __main__.py        # CLI: migrar, backfill, diario, validar
│   │   ├── config.py          # Lee variables de entorno y falla si falta alguna
│   │   ├── bccr_cliente.py    # Cliente de la API SDDE con reintentos
│   │   ├── simulado.py        # Cliente falso que lee tests/fixtures
│   │   ├── parser.py          # JSON del BCCR a filas (fecha, valor)
│   │   ├── validaciones.py    # Reglas de calidad por fila y por serie
│   │   ├── repositorio.py     # SQL: upsert de observaciones, registro de cargas y revisiones
│   │   ├── cargas.py          # Orquesta backfill, diario y validar
│   │   └── migrar.py          # Aplica db/migrations y siembra indicador desde el YAML
│   ├── scripts/
│   │   └── explorar_catalogo.py  # Paso 2: busca códigos y guarda fixtures
│   └── tests/
│       ├── fixtures/          # JSON reales del BCCR por indicador (sin token)
│       ├── unit/              # parser, validaciones, cliente, simulado
│       └── datos/             # Pruebas SQL sobre la base cargada
├── api/
│   ├── Dockerfile             # Multi-stage, node:24-alpine, usuario no root
│   ├── package.json
│   ├── src/
│   │   ├── main.ts            # Bootstrap, CORS, Swagger, ValidationPipe
│   │   ├── app.module.ts
│   │   ├── config/            # Lectura y validación de variables de entorno
│   │   ├── db/                # DbModule: Pool de pg como provider
│   │   ├── indicadores/       # Controller, service, repository y DTOs
│   │   ├── salud/             # /salud y /salud/vivo
│   │   └── comun/             # Filtro de errores con formato único
│   └── test/                  # e2e con supertest contra el Postgres de compose
├── web/
│   ├── package.json
│   ├── app/
│   │   ├── layout.tsx         # Fuentes, encabezado y pie
│   │   ├── page.tsx           # Inicio: tarjetas y gráfico de tipo de cambio
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── indicador/[slug]/page.tsx  # Detalle con selector de rango
│   │   ├── desarrolladores/page.tsx   # Cómo usar la API, enlace a Swagger
│   │   └── version/route.ts   # Devuelve el commit desplegado
│   ├── components/            # TarjetaIndicador, GraficoSerie, SelectorRango, EstadoVacio, EstadoError, Encabezado, Pie
│   └── lib/                   # api.ts (fetch con timeout y revalidate), formato.ts
├── e2e/
│   ├── package.json
│   ├── playwright.config.ts   # Proyectos movil (375x812) y escritorio (1280x800)
│   └── tests/                 # dashboard, graficos, swagger, desborde, api
└── .github/workflows/
    ├── ci.yml                 # Push y PR: lint, tests, build, Docker y Playwright local
    ├── migrar.yml             # Manual: aplica migraciones en Neon
    ├── etl-backfill.yml       # Manual: carga histórica en Neon
    ├── etl-diario.yml         # Cron 2 veces al día: diario + validar + alerta
    ├── post-deploy.yml        # Push a main: espera el deploy y corre Playwright en producción
    └── vigilancia.yml         # Cron: despierta Render, smoke tests y mantiene vivos los crons
```

---

## 6. Modelo de datos

`db/migrations/001_esquema.sql`:

```sql
CREATE TABLE schema_migraciones (
  version     text PRIMARY KEY,
  aplicado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE indicador (
  id           smallserial PRIMARY KEY,
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z_]+$'),
  codigo_bccr  integer NOT NULL UNIQUE CHECK (codigo_bccr > 0),
  nombre       text NOT NULL,
  unidad       text NOT NULL,
  periodicidad text NOT NULL CHECK (periodicidad IN ('diaria', 'semanal', 'mensual', 'irregular')),
  valor_min    numeric(14,4) NOT NULL,
  valor_max    numeric(14,4) NOT NULL,
  activo       boolean NOT NULL DEFAULT true,
  CHECK (valor_min < valor_max)
);

CREATE TABLE carga (
  id                 bigserial PRIMARY KEY,
  tipo               text NOT NULL CHECK (tipo IN ('diaria', 'backfill', 'validacion')),
  modo               text NOT NULL CHECK (modo IN ('real', 'simulado')),
  inicio             timestamptz NOT NULL DEFAULT now(),
  fin                timestamptz,
  estado             text NOT NULL DEFAULT 'en_curso'
                     CHECK (estado IN ('en_curso', 'ok', 'parcial', 'error')),
  filas_insertadas   integer NOT NULL DEFAULT 0 CHECK (filas_insertadas >= 0),
  filas_actualizadas integer NOT NULL DEFAULT 0 CHECK (filas_actualizadas >= 0),
  detalle            jsonb NOT NULL DEFAULT '{}'::jsonb,
  error              text,
  CHECK (fin IS NULL OR fin >= inicio)
);
CREATE INDEX carga_estado_inicio_idx ON carga (estado, inicio DESC);

CREATE TABLE observacion (
  indicador_id   smallint NOT NULL REFERENCES indicador(id) ON DELETE RESTRICT,
  fecha          date NOT NULL CHECK (fecha >= DATE '2015-01-01'),
  valor          numeric(14,4) NOT NULL,
  carga_id       bigint NOT NULL REFERENCES carga(id) ON DELETE RESTRICT,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (indicador_id, fecha)
);
CREATE INDEX observacion_fecha_idx ON observacion (fecha);

-- Cuando el BCCR corrige un valor ya guardado, se registra aquí antes de actualizarlo.
CREATE TABLE revision (
  id             bigserial PRIMARY KEY,
  indicador_id   smallint NOT NULL REFERENCES indicador(id) ON DELETE RESTRICT,
  fecha          date NOT NULL,
  valor_anterior numeric(14,4) NOT NULL,
  valor_nuevo    numeric(14,4) NOT NULL,
  carga_id       bigint NOT NULL REFERENCES carga(id) ON DELETE RESTRICT,
  detectado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK (valor_anterior <> valor_nuevo)
);
CREATE INDEX revision_indicador_fecha_idx ON revision (indicador_id, fecha);
```

`db/migrations/002_permisos.sql` (los roles `etl_writer` y `api_reader` ya existen: en Neon se crean con SQL (no desde la consola, que les da privilegios de más) y en local con `db/local/init-roles.sh`):

```sql
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO etl_writer, api_reader;

GRANT SELECT ON indicador, observacion, carga TO api_reader;

GRANT SELECT ON indicador TO etl_writer;
GRANT SELECT, INSERT, UPDATE ON observacion, carga TO etl_writer;
GRANT SELECT, INSERT ON revision TO etl_writer;
GRANT USAGE, SELECT ON SEQUENCE carga_id_seq, revision_id_seq TO etl_writer;
```

`db/migrations/003_dias_adelanto.sql` (los días por delante de "hoy" con los que el BCCR publica cada indicador):

```sql
ALTER TABLE indicador
  ADD COLUMN dias_adelanto smallint NOT NULL DEFAULT 0 CHECK (dias_adelanto >= 0);
```

**Siembra de `indicador`.** `python -m etl migrar` aplica los SQL pendientes en orden y registra cada uno en `schema_migraciones`. Después hace un upsert de `indicador` desde `etl/indicadores.yaml` usando `slug` como clave. Formato del YAML:

```yaml
- slug: tc_compra
  codigo_bccr: 317
  nombre: Tipo de cambio de referencia, compra
  unidad: colones por dólar
  periodicidad: diaria
  valor_min: 400
  valor_max: 800
  dias_adelanto: 1
- slug: tc_venta
  codigo_bccr: 318
  nombre: Tipo de cambio de referencia, venta
  unidad: colones por dólar
  periodicidad: diaria
  valor_min: 400
  valor_max: 800
  dias_adelanto: 1
# ipc_indice (índice, valor_min 70, valor_max 150), ipc_interanual (porcentaje, -5 a 30),
# tbp (porcentaje, 0 a 20) y tpm (porcentaje, 0 a 15): el paso 2 completa código, nombre
# oficial y periodicidad a partir del catálogo del BCCR. dias_adelanto: tc_compra 1,
# tc_venta 1, tbp 10, tpm 0, ipc_indice 0 e ipc_interanual 0.
```

---

## 7. Seguridad

- **Sin claves en el código.** Toda credencial se lee del entorno. `.env*` está en `.gitignore`, salvo `.env.example`. `gitleaks` corre en CI y bloquea el merge si encuentra un secreto.
- **El token del BCCR** solo existe en `etl/.env` (local) y en el secret `BCCR_TOKEN` de GitHub. Nunca se imprime: el cliente no registra los headers, y los errores del BCCR se resumen a código HTTP y mensaje, sin el cuerpo completo.
- **Si una clave se filtra** (en un chat, en un commit o en un log), se rota de inmediato: token nuevo en el BCCR o contraseña nueva del rol en Neon. Después se actualiza el secret.
- **Mínimo privilegio en la base.** No hay RLS porque no hay usuarios finales. El control es por rol: la API se conecta con `api_reader` (solo `SELECT`), el ETL con `etl_writer` (sin `DELETE` ni DDL) y las migraciones con el rol dueño, solo desde `migrar.yml` o en local.
- **Conexiones a Neon** con `sslmode=require`. La API no arranca si `DATABASE_URL_API` apunta a un host que no sea `localhost`, `127.0.0.1` o `db` y no incluye `sslmode=require`: muestra "DATABASE_URL_API debe incluir sslmode=require" sin imprimir la cadena.
- **API:** solo `GET`. ValidationPipe con `whitelist: true` y `forbidNonWhitelisted: true`. `slug` validado contra `^[a-z_]+$`. Fechas en formato `YYYY-MM-DD`, `desde <= hasta` y `desde >= 2015-01-01`. Todas las consultas SQL son parametrizadas (`$1`, `$2`), nunca concatenadas.
- **Límite de peticiones:** 60 por minuto por IP (`THROTTLE_LIMIT`, `THROTTLE_TTL_MS`). Responde 429.
- **CORS:** solo `CORS_ORIGENES` (la URL de Vercel y `http://localhost:3000`).
- **Headers:** `helmet` no se agrega (sería una dependencia más). La API pone `X-Content-Type-Options: nosniff` en todas las respuestas y `Cache-Control: public, max-age=3600` solo en las respuestas 200 de `/indicadores*`. Todo error (4xx y 5xx) y `/salud` llevan `Cache-Control: no-store`.
- **Docker:** la imagen de la API corre con el usuario `node`, no como root.
- **Errores:** nunca se devuelve un stack trace. El formato es único: `{ "statusCode": 404, "error": "No encontrado", "mensaje": "..." }`.

---

## 8. API y lógica

### 8.1 ETL (CLI `python -m etl <comando>`)

Variables comunes: `BCCR_MODO` (`real` | `simulado`), `BCCR_TOKEN`, `BCCR_BASE_URL` y `DATABASE_URL_ETL`. Si falta alguna en modo `real`, el proceso termina con código 1 antes de hacer nada.

**Cliente BCCR (`bccr_cliente.py`).**
- Endpoint: `GET {BCCR_BASE_URL}/indicadoresEconomicos/{codigo}/series?fechaInicio=YYYY/MM/DD&fechaFin=YYYY/MM/DD&idioma=ES`. Las barras van codificadas como `%2F`.
- Header: `Authorization: Bearer {BCCR_TOKEN}`.
- Timeout de 30 s. Máximo 3 intentos con espera exponencial (2 s, 4 s y 8 s), solo ante timeout, error de conexión o HTTP 5xx/429. Ante 400, 401 o 403 falla sin reintentar.
- Los pedidos de más de 1 año se parten en tramos de 1 año.
- El formato exacto de la respuesta JSON se toma de los fixtures reales del paso 2. `parser.py` se escribe contra esos fixtures.

**Cliente simulado (`simulado.py`).** Misma interfaz que el cliente real. Lee `tests/fixtures/{slug}.json` y filtra por fechas. No abre ninguna conexión de red. Un test verifica que, en modo simulado, `httpx` nunca se llama.

**Validaciones (`validaciones.py`).** Se aplican a cada fila antes de guardar:

| Regla | Si falla |
|---|---|
| `valor` no nulo y numérico | La fila se descarta y se anota en `carga.detalle.rechazadas` |
| `valor` dentro de `[valor_min, valor_max]` del indicador | Se descarta y se anota |
| `fecha >= 2015-01-01` y `fecha <= hoy_cr + dias_adelanto` del indicador (`hoy_cr` es la fecha en Costa Rica, UTC-6; nunca se usa la fecha UTC) | Se descarta y se anota |
| Sin fechas duplicadas en el mismo lote | Se descarta el lote completo del indicador y se anota |

Si hay al menos una fila rechazada, la carga queda en `parcial` y el comando sale con código 2. **Nunca se rellenan huecos.** Si el BCCR no publicó una fecha, esa fecha no existe en la base.

Los huecos se revisan en `validar` como advertencia: más de 4 días seguidos sin dato en una serie diaria, más de 10 en una semanal o más de 40 en una mensual. Se anotan en `carga.detalle.huecos` y no fallan.

**Upsert (`repositorio.py`).** En una transacción por indicador:
1. Lee los valores existentes de las fechas del lote.
2. Si una fecha ya existe con otro valor, inserta en `revision`.
3. Hace `INSERT ... ON CONFLICT (indicador_id, fecha) DO UPDATE SET valor = EXCLUDED.valor, carga_id = EXCLUDED.carga_id, actualizado_en = now() WHERE observacion.valor <> EXCLUDED.valor`.
4. Suma `filas_insertadas` y `filas_actualizadas`.

**Comandos.**

| Comando | Qué hace | Código de salida |
|---|---|---|
| `migrar` | Usa `DATABASE_URL_ADMIN`. Aplica las migraciones pendientes y siembra `indicador`. | 0 ok, 1 error |
| `backfill --desde 2015-01-01 [--hasta HOY] [--slug X]` | Carga por tramos anuales. Registra una `carga` tipo `backfill`. Es idempotente. | 0 ok, 1 error, 2 parcial |
| `diario` | Pide los últimos 60 días de cada indicador activo, hasta hoy más su `dias_adelanto`, para recoger publicaciones nuevas y correcciones. Registra una `carga` tipo `diaria`. | 0, 1, 2 |
| `validar [--muestras 15]` | Por indicador, elige las 5 fechas más recientes y 10 al azar de los últimos 2 años. Las vuelve a pedir al BCCR (o a los fixtures en simulado) y compara con tolerancia de `0.0001`. Revisa huecos. Registra una `carga` tipo `validacion`. | 0 todo coincide, 1 hay diferencias o error |

Toda corrida escribe logs en JSON a stdout (`nivel`, `evento`, `slug`, `filas` y `duracion_ms`), sin el token.

### 8.2 API NestJS

Base: `https://<servicio>.onrender.com`. Todas las rutas son `GET`. Los datos se devuelven con `valor` como número (el `numeric` de Postgres se convierte con `Number()`) y `fecha` como `YYYY-MM-DD`.

| Ruta | Entrada | Salida 200 | Errores |
|---|---|---|---|
| `/indicadores` | n/a | `[{ slug, codigoBccr, nombre, unidad, periodicidad, ultimo: { fecha, valor } \| null, anterior: { fecha, valor } \| null }]`, solo los activos y ordenados por `id` | 429, 500 |
| `/indicadores/:slug` | `slug` | Un objeto igual a un elemento de la lista anterior | 400 slug inválido, 404 no existe, 429 |
| `/indicadores/:slug/serie` | `desde?`, `hasta?` (`YYYY-MM-DD`). Por defecto, `desde = 2015-01-01` y `hasta` = la última fecha disponible del indicador (puede ser posterior a hoy y coincide con `ultimo`) | `{ slug, nombre, unidad, desde, hasta, datos: [{ fecha, valor }] }`, ordenados por fecha ascendente. `datos` puede venir vacío. | 400 fechas inválidas o `desde > hasta`, 404, 429 |
| `/salud` | n/a | `{ estado: "ok", base: "ok", ultimaCarga: { tipo, fin, estado }, horasDesdeUltimaCarga }` | 503 con `estado: "degradado"` si la base no responde o la última carga `diaria` en estado `ok` tiene más de 36 h |
| `/salud/vivo` | n/a | `{ estado: "vivo", version: RENDER_GIT_COMMIT \|\| "local" }`. No toca la base. | n/a |
| `/docs` y `/docs-json` | n/a | Swagger UI y especificación OpenAPI. Título: "API de indicadores económicos de Costa Rica". | n/a |

Cada controlador documenta en Swagger sus parámetros, sus respuestas y un ejemplo.

Estructura interna: `IndicadoresController` llama a `IndicadoresService`, que llama a `IndicadoresRepository` (SQL con `pg`). La lógica no va en el controlador.

### 8.3 Web

`lib/api.ts` lee `API_URL` en el servidor y hace `fetch` con `next: { revalidate: 3600 }`, timeout de 90 s (por si Render despierta) y 2 reintentos. Si falla, lanza un error que captura `error.tsx`. Con ISR, Vercel sigue sirviendo la última versión buena mientras la nueva falla.

`app/version/route.ts` devuelve `{ version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" }` sin caché.

---

## 9. Pantallas

| Ruta | Muestra | Componentes | Vacío | Cargando | Error |
|---|---|---|---|---|---|
| `/` | Título, fecha de la última actualización (de `/salud`), 6 tarjetas con último valor, fecha y variación contra el dato anterior, y un gráfico de tipo de cambio compra y venta del último año | `Encabezado`, `TarjetaIndicador` x6, `GraficoSerie`, `Pie` | La tarjeta muestra "Sin datos publicados" si `ultimo` es null | `loading.tsx` con esqueletos del mismo tamaño que las tarjetas | `error.tsx`: "No pudimos cargar los indicadores" y botón Reintentar |
| `/indicador/[slug]` | Nombre, unidad, último valor, gráfico de la serie, selector de rango (1 mes, 6 meses, 1 año, 5 años, todo; por defecto 1 año), tabla con las últimas 10 observaciones y enlace a la fuente oficial (sdd.bccr.fi.cr) | `GraficoSerie`, `SelectorRango`, tabla | `EstadoVacio` si la serie no trae datos en el rango | Esqueleto | `error.tsx`; si el slug no existe, `notFound()` |
| `/desarrolladores` | Para qué sirve la API, la URL base, los 4 endpoints con un ejemplo `curl` y su respuesta, el límite de peticiones, el aviso de que el primer pedido puede tardar si la API dormía, y el enlace a `/docs` | Bloques de código copiables | n/a | n/a | n/a (página estática) |
| `not-found` | "Esta página no existe" y un enlace al inicio | n/a | n/a | n/a | n/a |

El detalle pide la serie completa desde 2015 una sola vez (con ISR) y filtra el rango en el cliente. Cambiar de rango no llama a la API.

`generateStaticParams` en `/indicador/[slug]` genera los 6 slugs.

---

## 10. UI

**Sistema visual propio**, distinto al de PuraReserva y al de turismo-cr. Los tokens finales salen del diseño aprobado en Figma (`docs/diseno/tokens.json`, paso 13). Si el diseño los cambia, manda el diseño. Estos son los tokens de partida:

| Token | Valor | Uso |
|---|---|---|
| `fondo` | `#F6F4EF` | Fondo general (papel) |
| `superficie` | `#FFFFFF` | Tarjetas |
| `tinta` | `#1A1D21` | Texto principal |
| `tinta-suave` | `#5B616B` | Texto secundario |
| `borde` | `#E2DED5` | Bordes y separadores |
| `primario` | `#0F4C5C` | Encabezado, enlaces y línea de venta |
| `acento` | `#D08C2E` | Línea de compra y foco |
| `sube` | `#2F7D4F` | Variación positiva |
| `baja` | `#B23A48` | Variación negativa |

- **Tipografía:** IBM Plex Sans para texto y IBM Plex Mono para cifras, con `tabular-nums`. Se cargan con `next/font/google`.
- **Escala:** 12, 14, 16, 20, 28 y 40 px. Espaciado en múltiplos de 4 px (escala de Tailwind). Radio de 8 px en tarjetas.
- **Formato de números:** `Intl.NumberFormat("es-CR")`. Colones con 2 decimales y símbolo ₡. Porcentajes con 2 decimales y `%`. Fechas como "16 nov 2026".
- **Variación:** flecha más texto ("+0,45 %"), no solo color.
- **Responsive:** móvil primero. A 375 px, las tarjetas van en 1 columna; desde `sm`, en 2; desde `lg`, en 3. Los gráficos usan `ResponsiveContainer` con alto de 240 px en móvil y 360 px en escritorio. Nada se desborda en horizontal a 375 px; la tabla del detalle va dentro de `overflow-x-auto`.
- **Accesibilidad:** contraste AA (revisar `tinta-suave` sobre `fondo`), foco visible con anillo de `acento`, `aria-label` en el selector de rango, y cada gráfico con un `figcaption` que resume el último valor. El HTML usa `lang="es"`.
- **Estilos:** solo clases de Tailwind y tokens en `@theme`. Sin estilos inline (salvo los colores que Recharts pide por prop, tomados de una constante que lee los tokens).

---

## 11. Variables de entorno

| Variable | Dónde se usa | Ejemplo | Dónde se obtiene |
|---|---|---|---|
| `BCCR_TOKEN` | ETL local (`etl/.env`) y secret de GitHub | `eyJ...` | Registro en el sitio de Indicadores Económicos del BCCR (paso 2) |
| `BCCR_BASE_URL` | ETL | `https://apim.bccr.fi.cr/SDDE/api/Bccr.GE.SDDE.Publico.Indicadores.API` | Documento "Estándar API SDDE" del BCCR. Valor fijo. |
| `BCCR_MODO` | ETL | `real` o `simulado` | `simulado` en CI y tests; `real` en los workflows del ETL |
| `DATABASE_URL_ADMIN` | `migrar` local y secret de GitHub (solo `migrar.yml`) | `postgresql://neondb_owner:***@ep-xxx.neon.tech/indicadores?sslmode=require` | Neon, cadena de conexión del rol dueño |
| `DATABASE_URL_ETL` | ETL local y secret de GitHub | `postgresql://etl_writer:***@ep-xxx.neon.tech/indicadores?sslmode=require` | Neon, rol `etl_writer` (paso 10) |
| `DATABASE_URL_API` | API (`api/.env` y Render) | `postgresql://api_reader:***@ep-xxx.neon.tech/indicadores?sslmode=require` | Neon, rol `api_reader` (paso 10) |
| `POSTGRES_PASSWORD` | docker compose (local) | contraseña larga generada | La genera Frander para su máquina |
| `ETL_DB_PASSWORD` | `db/local/init-roles.sh` (local) | contraseña larga generada | Igual que la anterior |
| `API_DB_PASSWORD` | `db/local/init-roles.sh` (local) | contraseña larga generada | Igual que la anterior |
| `PORT` | API | `3001` en local | Render la define sola en producción |
| `CORS_ORIGENES` | API | `http://localhost:3000,https://indicadores-cr.vercel.app` | URL de Vercel (paso 16) |
| `THROTTLE_LIMIT` | API | `60` | Valor fijo |
| `THROTTLE_TTL_MS` | API | `60000` | Valor fijo |
| `RENDER_GIT_COMMIT` | API | `a1b2c3...` | Render la define sola |
| `API_URL` | Web (servidor) | `http://localhost:3001` o `https://indicadores-cr-api.onrender.com` | URL de Render (paso 12) |
| `NEXT_PUBLIC_API_URL` | Web (página `/desarrolladores`) | `https://indicadores-cr-api.onrender.com` | La misma URL de Render |
| `VERCEL_GIT_COMMIT_SHA` | Web (`/version`) | `a1b2c3...` | Vercel la define sola |
| `URL_API` | Playwright | `http://localhost:3001` o la URL de Render | Variable de repositorio en GitHub (paso 17) |
| `URL_WEB` | Playwright | `http://localhost:3000` o la URL de Vercel | Variable de repositorio en GitHub (paso 17) |
| `GITHUB_TOKEN` | Workflows (abrir issues y reactivar workflows) | automático | GitHub lo da en cada corrida |

`.env.example` lista todas, con valores de ejemplo y sin datos reales.

---

## 12. Orden de construcción

Reglas: un paso a la vez. Al final de cada paso, corré su verificación. **Si algo falla, no avances:** arreglalo o detenete y reportá. En los pasos marcados **PAUSA**, detenete, decile a Frander exactamente qué hacer en su cuenta y esperá su confirmación. Hacé un commit por paso con un mensaje corto en español.

### Paso 0. Skills

Instalá find-skills: `npx skills add vercel-labs/skills --skill find-skills -a claude-code -y`. Buscá skills para Python/pytest, NestJS, Next.js, Tailwind, PostgreSQL, Docker, GitHub Actions y Playwright. Mostrale la lista a Frander, con origen y qué hace cada una. **PAUSA:** no instales ninguna skill de terceros sin su aprobación.
**Verificación:** lista mostrada y aprobación de Frander registrada en el chat.

### Paso 1. Repo base y versiones

Creá la estructura de la sección 5 (las carpetas vacías llevan `.gitkeep`), `.gitignore`, `.env.example`, un `README.md` mínimo y `git init`. Inicializá `etl/` (venv y `requirements*.txt`), `api/` (`npx @nestjs/cli@11 new api --package-manager npm --skip-git`), `web/` (`npx create-next-app@16 web --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`) y `e2e/` (`npm init playwright@latest`). Fijá todas las versiones exactas según la regla de la sección 4 y escribí `docs/versiones.md`.
**Criterio:** ninguna dependencia tiene `^`, `~`, `>=` ni `latest`.
**Verificación:** `grep -rnE '"[\^~]' api/package.json web/package.json e2e/package.json` no devuelve nada; `grep -vE '==' etl/requirements*.txt | grep -v '^#' | grep -v '^$'` no devuelve nada; `git status` limpio después del commit.

### Paso 2. PAUSA: token del BCCR y catálogo

**PAUSA.** Frander se registra en el sitio de Indicadores Económicos del BCCR (bccr.fi.cr → Indicadores Económicos → Servicio web) y obtiene el token de la API SDDE. Lo pega **solo** en `etl/.env` como `BCCR_TOKEN=...`, nunca en el chat. Si lo pega en el chat, hay que pedir uno nuevo.

Después escribí `etl/scripts/explorar_catalogo.py`:
1. Pide la serie de 317 y 318 de los últimos 7 días e imprime la estructura del JSON (claves y tipos, no el token).
2. Descarga el catálogo de indicadores (`/indicadoresEconomicos/descargar?idioma=ES`, que devuelve un Excel (.xlsx)) y busca por nombre: IPC nivel, IPC variación interanual, tasa básica pasiva y tasa de política monetaria. Imprime los candidatos con código y nombre oficial.
3. Para los 6 códigos elegidos, guarda en `etl/tests/fixtures/{slug}.json` la respuesta real de 2024-01-01 a 2024-06-30.

Completá `etl/indicadores.yaml` con los 6 indicadores. **PAUSA:** Frander confirma los 4 códigos nuevos abriendo cada indicador en sdd.bccr.fi.cr y comparando el nombre y el último valor.
**Verificación:** `python etl/scripts/explorar_catalogo.py` termina sin error; existen 6 archivos en `etl/tests/fixtures/`; `grep -ri "bearer\|token" etl/tests/fixtures` no devuelve nada; Frander confirmó los códigos.

### Paso 3. Base local y migraciones

`docker-compose.yml` con el servicio `db` (`postgres:17-alpine` con tag exacto, volumen nombrado y healthcheck `pg_isready`) que monta `db/local/init-roles.sh` en `/docker-entrypoint-initdb.d/`. Ese script crea `etl_writer` y `api_reader` con `ETL_DB_PASSWORD` y `API_DB_PASSWORD`. Escribí `001_esquema.sql`, `002_permisos.sql`, `etl/etl/migrar.py`, `config.py` y el comando `migrar`.
**Criterio:** `migrar` es idempotente (correrlo dos veces no falla ni duplica nada).
**Verificación:** `docker compose up -d db`, luego `python -m etl migrar` dos veces seguidas con salida 0; `psql "$DATABASE_URL_ADMIN" -c "select slug, codigo_bccr from indicador order by id"` muestra 6 filas; `psql` como `api_reader` intentando `insert into carga(tipo,modo) values('diaria','real')` falla con "permission denied".

### Paso 4. Cliente BCCR, simulado y parser

`bccr_cliente.py`, `simulado.py` y `parser.py` según la sección 8.1. Tests en `tests/unit/`: parser contra cada fixture, tramos anuales, reintentos ante 503 (con respx), sin reintento ante 401, el token no aparece en logs ni en errores, y en modo simulado no hay llamadas de red.
**Verificación:** `cd etl && ruff check . && ruff format --check . && BCCR_MODO=simulado pytest tests/unit -q`, todo verde.

### Paso 5. Validaciones, carga y registro

`validaciones.py`, `repositorio.py`, `cargas.py` y los comandos `diario`, `backfill` y `validar`. Tests unitarios de cada regla de validación. Tests en `tests/datos/` que corren sobre la base: no hay `(indicador_id, fecha)` repetidos, ningún `valor` está fuera del rango de su indicador, no hay fechas futuras, toda `observacion.carga_id` existe y cada indicador tiene al menos una fila.
**Criterio:** correr `diario` dos veces seguidas en simulado deja `filas_insertadas = 0` en la segunda corrida.
**Verificación:** `BCCR_MODO=simulado python -m etl backfill --desde 2024-01-01 --hasta 2024-06-30`, después `BCCR_MODO=simulado python -m etl validar` (salida 0) y `BCCR_MODO=simulado pytest tests -q`, todo verde.

### Paso 6. Backfill real en local y validación manual

Con el token real: `BCCR_MODO=real python -m etl backfill --desde 2015-01-01`, luego `python -m etl validar` y `pytest tests/datos -q`. Escribí `docs/validacion-manual.md` con una tabla de 3 fechas por indicador (incluida la más reciente): valor en la base, valor en sdd.bccr.fi.cr y coincide sí o no.
**PAUSA:** Frander revisa la tabla y la confirma.
**Verificación:** `validar` sale con 0; `select i.slug, count(*), min(fecha), max(fecha) from observacion o join indicador i on i.id=o.indicador_id group by 1` muestra los 6 indicadores; las 18 filas de `validacion-manual.md` coinciden.

### Paso 7. API NestJS

Módulos `config`, `db`, `indicadores`, `salud` y `comun` según la sección 8.2. Swagger, `ValidationPipe`, throttler, CORS y filtro de errores. Tests unitarios del service (repository simulado) y e2e con supertest contra la base local del paso 5 (simulado), con casos para 200, 400, 404 y 429.
**Verificación:** `cd api && npm run lint && npm run build && npm test && npm run test:e2e`, todo verde; con la API corriendo, `curl -s localhost:3001/indicadores | jq length` devuelve 6 y `curl -s -o /dev/null -w "%{http_code}" localhost:3001/docs` devuelve 200.

### Paso 8. Docker de la API y del ETL

`api/Dockerfile` multi-stage (build y runtime, `npm ci --omit=dev`, usuario `node`, `EXPOSE 3001`). `etl/Dockerfile` con `python:3.12-slim` (tag exacto). En compose, los servicios `api` (depende de `db` sano) y `etl` (perfil `etl`).
**Verificación:** `docker compose up -d --build db api`, después `curl -s localhost:3001/salud/vivo` devuelve `{"estado":"vivo",...}`, y `docker compose --profile etl run --rm -e BCCR_MODO=simulado etl diario` sale con 0.

### Paso 9. CI

`.github/workflows/ci.yml` en push y pull request, con jobs `secretos` (gitleaks), `etl` (ruff y pytest en simulado sobre un Postgres de servicio), `api` (lint, build, test y e2e), `web` (lint y build con `API_URL` apuntando a la API levantada en el job) y `docker` (build de ambas imágenes). Playwright local se agrega en el paso 15. CI no recibe `BCCR_TOKEN`.
**PAUSA:** Frander crea el repo **público** `pipeline-indicadores-cr` en su GitHub y autoriza el push.
**Verificación:** push a una rama y `gh run watch` termina en verde en todos los jobs.

### Paso 10. PAUSA: Neon y secrets

**PAUSA.** Frander:
1. Crea en Neon el proyecto `indicadores-cr` (Postgres 17, región `aws-us-east-1` o la más cercana disponible) y la base `indicadores`.
2. En Settings → Compute, fija el autoscaling en 0.25 CU como mínimo y como máximo, con suspensión a los 5 minutos.
3. En el SQL Editor, crea `etl_writer` y `api_reader` con `CREATE ROLE ... LOGIN PASSWORD` (no desde la pestaña Roles: la consola les da membresía en `neon_superuser` y los atributos CREATEROLE, CREATEDB y BYPASSRLS) y guarda sus contraseñas en su gestor de contraseñas. Verificá en `pg_roles` que `rolcreaterole`, `rolcreatedb` y `rolbypassrls` den `false` y que no sean miembros de ningún otro rol.
4. En GitHub → Settings → Secrets and variables → Actions, crea los secrets `BCCR_TOKEN`, `DATABASE_URL_ADMIN`, `DATABASE_URL_ETL` y `DATABASE_URL_API`.

Después escribí `migrar.yml` (`workflow_dispatch`, corre `migrar`) y `etl-backfill.yml` (`workflow_dispatch` con el input `desde`, corre `backfill` y después `validar`).
**Verificación:** correr `migrar.yml` y `etl-backfill.yml` desde `gh workflow run`; ambos en verde; la consulta de conteos del paso 6, contra Neon, da los mismos números (± las publicaciones nuevas del día).

### Paso 11. ETL diario y alertas

`etl-diario.yml`:
- `schedule`: `15 12 * * *` y `15 0 * * *` (06:15 y 18:15 en Costa Rica). Más `workflow_dispatch` con el input booleano `simular_fallo`.
- Pasos: `diario` y después `validar`. Si `simular_fallo` es true, sale con 1 antes de cargar.
- Si algún paso falla: `gh issue create` con el título "Falla ETL diario" y la etiqueta `alerta`, el enlace a la corrida y el código de salida. Si ya hay un issue abierto con ese título, agrega un comentario en vez de abrir otro.
- `concurrency: etl` para que no corran dos cargas a la vez.

**Verificación:** `gh workflow run etl-diario.yml` termina en verde y aparece una fila nueva en `carga` con `estado = 'ok'`; `gh workflow run etl-diario.yml -f simular_fallo=true` falla y abre el issue (cerralo después).

### Paso 12. PAUSA: deploy de la API en Render

**PAUSA.** Frander crea en Render un Web Service, plan Free, conectado al repo, con Root Directory `api`, Runtime Docker, Health Check Path `/salud/vivo`, auto-deploy desde `main` y las variables `DATABASE_URL_API`, `CORS_ORIGENES` (por ahora solo `http://localhost:3000`), `THROTTLE_LIMIT` y `THROTTLE_TTL_MS`. Te pasa la URL pública.
**Verificación:** `curl -s https://<api>.onrender.com/salud` devuelve 200 con `estado: "ok"`; `curl -s https://<api>.onrender.com/indicadores | jq length` devuelve 6; `/docs` devuelve 200; y el último valor de `tc_venta` coincide con sdd.bccr.fi.cr.

### Paso 13. PAUSA: diseño aprobado

**PAUSA.** Antes de escribir cualquier componente de la interfaz tiene que existir `docs/diseno/` con el enlace al archivo de Figma (o la maqueta HTML aprobada), las capturas a 375 y 1280 px y `tokens.json`. Si no existe, detenete y pedíselo a Frander. Pasá los tokens a `web/app/globals.css` (`@theme`).
**Verificación:** `docs/diseno/tokens.json` existe y Frander confirmó que el diseño está aprobado; `npm run build` en `web/` sigue en verde.

### Paso 14. Dashboard Next.js

Pantallas de la sección 9, con los estados de vacío, cargando y error, `lib/api.ts`, `lib/formato.ts` y `/version`. Igual al diseño aprobado.
**Verificación:** con `docker compose up -d db api` (datos simulados), `cd web && npm run lint && npm run build && npm start`; abrir `http://localhost:3000`, `/indicador/tc_venta`, `/desarrolladores` y `/no-existe` a 375 y 1280 px en el navegador. Las 4 cargan sin errores en la consola. Detené la API y recargá `/indicador/tc_venta` en `npm run dev`: se ve el estado de error, no una pantalla rota.

### Paso 15. Playwright

`e2e/` con `playwright.config.ts` (proyectos `movil` 375x812 y `escritorio` 1280x800, `baseURL` desde `URL_WEB`, timeout de 120 s por test para tolerar el arranque de Render). Tests:
1. `dashboard.spec.ts`: `/` responde 200, hay 6 tarjetas y cada una muestra un número.
2. `graficos.spec.ts`: en `/` y en `/indicador/tc_venta` existe al menos un `.recharts-line-curve` con atributo `d` de más de 50 caracteres; cambiar el rango a "5 años" cambia el `d`.
3. `swagger.spec.ts`: `${URL_API}/docs` muestra el título de la API, y `${URL_API}/docs-json` tiene las rutas `/indicadores`, `/indicadores/{slug}/serie` y `/salud`.
4. `desborde.spec.ts`: en `/`, `/indicador/tc_venta`, `/desarrolladores` y la 404, `document.documentElement.scrollWidth <= window.innerWidth`.
5. `api.spec.ts`: `GET /indicadores` devuelve 6, `GET /salud` devuelve 200, `GET /indicadores/no_existe` devuelve 404.

Agregá el job `e2e` a `ci.yml`: levanta db y api con compose, carga datos simulados, hace build y start del web y corre Playwright. Si falla, sube el reporte como artifact.
**Verificación:** `cd e2e && URL_WEB=http://localhost:3000 URL_API=http://localhost:3001 npx playwright test` en verde en ambos proyectos; push y el job `e2e` en verde en Actions.

### Paso 16. PAUSA: deploy del web en Vercel

**PAUSA.** Frander importa el repo en Vercel, plan Hobby, con Root Directory `web` y las variables `API_URL` y `NEXT_PUBLIC_API_URL` (URL de Render). Te pasa la URL. Después agrega esa URL a `CORS_ORIGENES` en Render.
**Verificación:** abrir la URL de Vercel; carga en menos de 3 s (ISR); `curl -s https://<web>.vercel.app/version` devuelve el SHA de `main`.

### Paso 17. Pruebas en producción y vigilancia

**PAUSA.** Frander crea las variables de repositorio `URL_API` y `URL_WEB` en GitHub con las URLs públicas.

`post-deploy.yml` (push a `main`): espera hasta 15 min a que `${URL_API}/salud/vivo` devuelva `version == github.sha` y `${URL_WEB}/version` también. Después corre Playwright contra producción. Si falla, abre un issue "Falla en producción después del deploy" con el SHA.

`vigilancia.yml`:
- `*/10 * * * *`: `curl` a `${URL_API}/salud/vivo` (no toca la base; mantiene Render despierto).
- `7 * * * *` (cada hora): `${URL_API}/salud` debe dar 200 y se corren `api.spec.ts` y `dashboard.spec.ts` contra producción. Si falla, abre o comenta el issue "Producción degradada".
- `0 9 1 * *` (mensual): reactiva con `gh api -X PUT repos/{owner}/{repo}/actions/workflows/{archivo}/enable` los workflows `etl-diario.yml`, `vigilancia.yml` y `post-deploy.yml`, para que GitHub no los desactive tras 60 días sin actividad en el repo.

**Verificación:** `gh workflow run post-deploy.yml` y `gh workflow run vigilancia.yml` en verde contra producción; en Render, Metrics muestra que el servicio no se durmió en la última hora.

### Paso 18. Cierre

`README.md` final con: qué es, URLs del dashboard, de la API y de Swagger, un diagrama de arquitectura en Mermaid, badges de CI, ETL diario y vigilancia, cómo correrlo local (`docker compose`), cómo correr las pruebas, las fuentes (BCCR) y las decisiones de la sección 15. Capturas a 375 y 1280 px en `docs/`.
**Verificación:** todos los workflows en verde en la última corrida; la revisión de producción de Frander a 375 y 1280 px no reporta errores; ningún secreto en el historial (`gitleaks detect --source . --log-opts="--all"` sin hallazgos).

---

## 13. Pruebas

| Tipo | Qué | Dónde corre | Comando |
|---|---|---|---|
| Unitarias ETL | Parser contra fixtures reales, tramos de fechas, reintentos (respx), sin reintento ante 401, token ausente en logs, cada regla de validación, el simulado no usa la red | Local y CI | `BCCR_MODO=simulado pytest etl/tests/unit -q` |
| Datos | Unicidad `(indicador_id, fecha)`, rangos por indicador, sin fechas futuras, FKs válidas, 6 indicadores con datos, `diario` idempotente | Local y CI sobre Postgres; en Neon después del backfill | `pytest etl/tests/datos -q` |
| Validación contra la fuente | `validar`: 15 fechas por indicador comparadas contra el BCCR con tolerancia de 0.0001 | Después de cada carga diaria y de cada backfill (real); en CI contra fixtures | `python -m etl validar` |
| Validación manual | 18 valores comparados con sdd.bccr.fi.cr | Una vez, en el paso 6 | `docs/validacion-manual.md` |
| Unitarias API | Service con repository simulado: conversión numérica, ordenamiento, `ultimo` y `anterior`, errores | Local y CI | `npm test` |
| E2E API | 200, 400, 404 y 429 con supertest contra Postgres | Local y CI | `npm run test:e2e` |
| E2E web | Dashboard carga, gráficos dibujados, Swagger responde, sin desborde a 375 y 1280 | CI (local), post-deploy y cada hora (producción) | `npx playwright test` |
| Secretos | gitleaks | CI | job `secretos` |

**Nunca se inventan cifras.** Los tests no escriben valores a mano para "parecer reales". Los fixtures son respuestas reales del BCCR, capturadas en el paso 2.

---

## 14. Despliegue

1. **Neon** (paso 10): proyecto `indicadores-cr`, base `indicadores`, Postgres 17, compute de 0.25 CU con suspensión a los 5 min y roles `etl_writer` y `api_reader`. Migraciones con `gh workflow run migrar.yml`. Histórico con `gh workflow run etl-backfill.yml -f desde=2015-01-01`.
2. **GitHub Actions** (pasos 9 a 11): secrets `BCCR_TOKEN`, `DATABASE_URL_ADMIN`, `DATABASE_URL_ETL` y `DATABASE_URL_API`. Variables `URL_API` y `URL_WEB`. El repo debe ser público (minutos ilimitados).
3. **Render** (paso 12): New → Web Service → repo → Root Directory `api`, Runtime Docker, plan Free, Health Check `/salud/vivo`, auto-deploy desde `main`. Variables: `DATABASE_URL_API`, `CORS_ORIGENES`, `THROTTLE_LIMIT` y `THROTTLE_TTL_MS`.
4. **Vercel** (paso 16): Add New → Project → repo → Root Directory `web`, framework Next.js, plan Hobby. Variables: `API_URL` y `NEXT_PUBLIC_API_URL`.
5. **Después de cada deploy:** `post-deploy.yml` espera el SHA nuevo en ambos servicios y corre Playwright contra producción. Un deploy no se da por bueno hasta que ese workflow está en verde.
6. **Revisión humana:** Frander (o Claude en Cowork con Claude in Chrome) revisa la URL pública a 375 y 1280 px.
7. **Rollback:** en Render, "Rollback" al deploy anterior; en Vercel, "Promote" del deploy anterior. Las migraciones solo agregan; nunca se borran columnas en el MVP.

---

## 15. Supuestos y riesgos

**Supuestos**
- La API SDDE del BCCR (`apim.bccr.fi.cr`) sigue disponible con token Bearer y el formato de fechas `yyyy/mm/dd`. Si cambia, falla el ETL diario, se abre un issue y se ajusta `parser.py` o `bccr_cliente.py`.
- El BCCR publica valores para IPC (nivel y variación interanual), TBP y TPM en la API SDDE. Si alguno no existe ahí, el paso 2 lo detecta y Frander decide si se quita del MVP.
- El plan gratis de Render da 750 horas al mes y un servicio despierto todo el mes usa como máximo 744. Si Render cambia el plan, la API se dormiría: el dashboard sigue funcionando por ISR y solo la API directa tendría cold start.
- Neon Free da 100 CU-horas al mes por proyecto y 1 GB. Con 6 indicadores desde 2015 (unas 12.000 filas) el almacenamiento queda muy por debajo.
- Las versiones mayores de la sección 4 eran las estables al escribir este documento. El paso 1 confirma y fija las exactas.
- El IPC cambia de base cada pocos años (2006, 2015, diciembre 2020, junio 2026). Cada base es un código distinto del BCCR y recalcula toda la historia. El proyecto usa la base junio 2026 (98404 y 98407). Si el BCCR publica una base nueva, hay que cambiar el código en `indicadores.yaml` y volver a correr el backfill de esos dos indicadores.
- Cada indicador se publica con un adelanto distinto respecto de "hoy" en Costa Rica (columna `dias_adelanto`): tipos de cambio 1 día, TBP 10 días y el resto 0. Una fecha más allá de ese límite se rechaza y la carga queda en `parcial`.

**Riesgos y mitigación**

| Riesgo | Mitigación |
|---|---|
| Neon gasta sus 100 CU-horas si se le hace ping muy seguido | El ping cada 10 min va a `/salud/vivo`, que no toca la base. La base solo se consulta cada hora (vigilancia), en las 2 cargas diarias y en la revalidación ISR. Compute fijo en 0.25 CU. Estimado: menos de 25 CU-horas al mes. |
| GitHub desactiva los crons después de 60 días sin actividad | Job mensual en `vigilancia.yml` que reactiva los workflows por API. |
| Los crons de GitHub se retrasan o se saltan corridas | Dos cargas al día con ventana de 60 días; `/salud` da 503 si pasan más de 36 h sin carga y eso abre un issue. |
| El BCCR corrige datos ya publicados | `diario` vuelve a pedir 60 días; los cambios quedan en `revision`. |
| El token del BCCR vence o se revoca | Responde 401, el ETL falla sin reintentar, se abre el issue y Frander rota el token. |
| Una clave termina en un chat o un commit | Se rota de inmediato; gitleaks en CI. |
| Un cambio rompe producción sin que CI lo note (lección de turismo-cr) | Versiones exactas, Playwright contra la URL pública después de cada deploy y cada hora. |
| Render tarda en despertar y el build de Vercel falla | `lib/api.ts` con timeout de 90 s y reintentos; la vigilancia mantiene Render despierto. |

---

## 16. Reglas para el constructor

1. Seguí el orden de la sección 12. Un paso a la vez.
2. Después de cada paso, corré su verificación. **Si algo falla, no avances.** Arreglalo o detenete y reportá qué falló.
3. En cada **PAUSA**, detenete y decile a Frander exactamente qué tiene que hacer y dónde. Esperá su confirmación.
4. No agregues funciones, dependencias ni servicios fuera de este documento. Si algo parece necesario, preguntá primero.
5. Código simple y organizado: carpetas como en la sección 5, nombres en español para el dominio, sin abstracciones que no se usen dos veces.
6. Versiones exactas siempre. Nada de `^`, `~` ni `latest`.
7. Ninguna clave en el código, en los tests, en los logs ni en el chat. Si Frander pega una clave en el chat, decile que la rote.
8. Nunca inventes cifras. Todo número sale de la base, y la base sale del BCCR.
9. CI nunca llama al BCCR real: usa `BCCR_MODO=simulado`.
10. Un deploy no está listo hasta que pasan las pruebas contra la URL pública.
11. La interfaz no se programa sin el diseño aprobado (paso 13).
12. Respondé en español, corto y directo.
