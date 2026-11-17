"""Cliente falso con la misma interfaz que ClienteBccr. Lee tests/fixtures y no usa la red."""

import json
from datetime import date
from pathlib import Path

from etl.parser import Fila, parsear

FIXTURES = Path(__file__).resolve().parents[1] / "tests" / "fixtures"


class ClienteSimulado:
    def __init__(self, carpeta: Path = FIXTURES):
        self._carpeta = carpeta

    def cerrar(self) -> None:
        pass

    def serie(self, slug: str, codigo: int, desde: date, hasta: date) -> list[Fila]:
        archivo = self._carpeta / f"{slug}.json"
        filas = parsear(json.loads(archivo.read_text(encoding="utf-8")))
        return [fila for fila in filas if desde <= fila.fecha <= hasta]
