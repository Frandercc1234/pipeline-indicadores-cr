"""Lee variables de entorno y falla si falta alguna."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

CARPETA_ETL = Path(__file__).resolve().parents[1]
RAIZ_REPO = CARPETA_ETL.parent


def registrar(nivel: str, evento: str, **campos) -> None:
    """Escribe una línea de log en JSON a stdout. Nunca incluir secretos en los campos."""
    linea = {"ts": datetime.now(timezone.utc).isoformat(), "nivel": nivel, "evento": evento}
    print(json.dumps({**linea, **campos}), flush=True)


def cargar_env_local() -> None:
    """Carga etl/.env si existe, sin pisar variables que ya vienen del entorno."""
    archivo = CARPETA_ETL / ".env"
    if not archivo.exists():
        return
    for linea in archivo.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip("\"'"))


def requerir(*nombres: str) -> dict[str, str]:
    """Devuelve las variables pedidas. Si falta alguna, termina con código 1."""
    cargar_env_local()
    faltan = [n for n in nombres if not os.environ.get(n)]
    if faltan:
        registrar("error", "config_incompleta", faltan=faltan)
        sys.exit(1)
    return {n: os.environ[n] for n in nombres}
