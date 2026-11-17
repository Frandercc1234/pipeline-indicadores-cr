"""Paso 2: explora la API SDDE del BCCR, busca códigos y guarda fixtures reales.

Uso: python etl/scripts/explorar_catalogo.py
Nunca imprime el token ni los headers.
"""

import io
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx
import openpyxl
import yaml

RAIZ = Path(__file__).resolve().parents[1]
FIXTURES = RAIZ / "tests" / "fixtures"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) pipeline-indicadores-cr"

BUSQUEDAS = {
    "ipc_indice": ["índice de precios al consumidor", "ipc"],
    "ipc_interanual": ["interanual", "variación"],
    "tbp": ["básica pasiva"],
    "tpm": ["política monetaria"],
}


def leer_env() -> dict:
    env = {}
    for linea in (RAIZ / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in linea and not linea.lstrip().startswith("#"):
            clave, valor = linea.split("=", 1)
            env[clave.strip()] = valor.strip()
    return env


def pedir(cliente: httpx.Client, base: str, ruta: str, params: dict) -> httpx.Response:
    respuesta = cliente.get(f"{base}/{ruta}", params=params, timeout=60)
    if respuesta.status_code != 200:
        mensaje = ""
        try:
            mensaje = str(respuesta.json().get("Mensaje", ""))[:200]
        except ValueError:
            pass
        sys.exit(f"Error HTTP {respuesta.status_code} en {ruta}. {mensaje}")
    return respuesta


def estructura(valor, nivel=0) -> str:
    """Describe claves y tipos de un JSON, sin valores sensibles."""
    sangria = "  " * nivel
    if isinstance(valor, dict):
        return "\n".join(
            f"{sangria}{k}: {type(v).__name__}\n{estructura(v, nivel + 1)}".rstrip()
            for k, v in valor.items()
        )
    if isinstance(valor, list) and valor:
        return f"{sangria}[0]:\n{estructura(valor[0], nivel + 1)}"
    return ""


def fechas(desde: date, hasta: date) -> dict:
    return {
        "fechaInicio": desde.strftime("%Y/%m/%d"),
        "fechaFin": hasta.strftime("%Y/%m/%d"),
        "idioma": "ES",
    }


def main() -> None:
    env = leer_env()
    token, base = env.get("BCCR_TOKEN", ""), env.get("BCCR_BASE_URL", "")
    if not token or not base:
        sys.exit("Falta BCCR_TOKEN o BCCR_BASE_URL en etl/.env")
    base = base.rstrip("/")
    cabeceras = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    }
    with httpx.Client(headers=cabeceras) as cliente:
        print("== 1. Estructura de la serie (317 y 318, últimos 7 días)")
        hoy = datetime.now(timezone(timedelta(hours=-6))).date()  # hora de Costa Rica
        for codigo in (317, 318):
            r = pedir(
                cliente,
                base,
                f"indicadoresEconomicos/{codigo}/series",
                fechas(hoy - timedelta(days=7), hoy),
            )
            print(f"-- {codigo}")
            print(estructura(r.json()))

        print("\n== 2. Catálogo: candidatos por nombre")
        r = pedir(cliente, base, "indicadoresEconomicos/descargar", {"idioma": "ES"})
        libro = openpyxl.load_workbook(io.BytesIO(r.content), read_only=True, data_only=True)
        filas = []
        for hoja in libro.worksheets:
            for fila in hoja.iter_rows(values_only=True):
                if any(c is not None for c in fila):
                    filas.append([("" if c is None else str(c)) for c in fila])
        print(f"Hojas: {[h.title for h in libro.worksheets]}  Filas: {len(filas)}")
        print("Encabezado:", filas[0] if filas else "(vacío)")
        for slug, claves in BUSQUEDAS.items():
            print(f"-- {slug}")
            vistos = 0
            for fila in filas[1:]:
                texto = " ".join(fila).lower()
                if any(k in texto for k in claves) and vistos < 15:
                    print("  ", fila)
                    vistos += 1

        print("\n== 3. Fixtures 2024-01-01 a 2024-06-30")
        indicadores = yaml.safe_load((RAIZ / "indicadores.yaml").read_text(encoding="utf-8"))
        FIXTURES.mkdir(parents=True, exist_ok=True)
        for ind in indicadores:
            r = pedir(
                cliente,
                base,
                f"indicadoresEconomicos/{ind['codigo_bccr']}/series",
                fechas(date(2024, 1, 1), date(2024, 6, 30)),
            )
            (FIXTURES / f"{ind['slug']}.json").write_text(
                json.dumps(r.json(), ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"guardado {ind['slug']}.json (código {ind['codigo_bccr']})")


if __name__ == "__main__":
    main()
