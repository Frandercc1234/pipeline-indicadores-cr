# Versiones exactas

Resueltas el 2026-11-16 (paso 1). Ninguna se actualiza sin pasar CI y las pruebas contra producción.

## Runtime

| Pieza | Versión |
|---|---|
| Python (venv local e imagen `python:3.12-slim`) | 3.12.10 |
| Node.js local | 24.18.0 (imagen Docker: `node:24-alpine`, tag exacto en el paso 8) |
| PostgreSQL | 17 (imagen `postgres:17-alpine`, tag exacto en el paso 3) |

## etl (requirements*.txt)

| Paquete | Versión |
|---|---|
| httpx | 0.28.1 |
| tenacity | 9.2.1 |
| pandas | 2.3.3 |
| psycopg[binary] | 3.2.13 |
| PyYAML | 6.0.3 |
| pytest | 8.4.2 |
| respx | 0.22.0 |
| ruff | 0.17.5 |
| openpyxl | 3.1.5 |

## api (package.json)

| Paquete | Versión |
|---|---|
| @nestjs/common | 11.2.10 |
| @nestjs/core | 11.2.10 |
| @nestjs/platform-express | 11.2.10 |
| @nestjs/swagger | 11.4.8 |
| @nestjs/throttler | 6.8.0 |
| class-transformer | 0.5.1 |
| class-validator | 0.14.4 |
| pg | 8.23.1 |
| reflect-metadata | 0.2.2 |
| rxjs | 7.8.2 |
| @eslint/eslintrc | 3.3.7 |
| @eslint/js | 9.39.5 |
| @nestjs/cli | 11.0.24 |
| @nestjs/schematics | 11.1.0 |
| @nestjs/testing | 11.2.10 |
| @types/express | 5.0.6 |
| @types/jest | 30.0.0 |
| @types/node | 24.19.2 |
| @types/pg | 8.23.1 |
| @types/supertest | 7.2.1 |
| eslint | 9.39.5 |
| eslint-config-prettier | 10.1.8 |
| eslint-plugin-prettier | 5.5.7 |
| globals | 17.14.0 |
| jest | 30.5.2 |
| prettier | 3.10.1 |
| source-map-support | 0.5.21 |
| supertest | 7.3.2 |
| ts-jest | 29.4.15 |
| ts-loader | 9.6.2 |
| ts-node | 10.9.2 |
| tsconfig-paths | 4.2.0 |
| typescript | 5.9.3 |
| typescript-eslint | 8.73.0 |

## web (package.json)

| Paquete | Versión |
|---|---|
| next | 16.4.6 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| recharts | 3.10.1 |
| @tailwindcss/turbopack | 4.3.3 |
| @types/node | 20.19.43 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| eslint | 9.39.5 |
| eslint-config-next | 16.4.6 |
| tailwindcss | 4.3.3 |
| typescript | 5.9.3 |

## e2e (package.json)

| Paquete | Versión |
|---|---|
| @playwright/test | 1.65.1 |
