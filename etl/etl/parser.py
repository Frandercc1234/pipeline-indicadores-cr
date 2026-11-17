"""Convierte el JSON de series del BCCR en filas (fecha, valor)."""

from datetime import date
from typing import NamedTuple


class ErrorParseo(Exception):
    """La respuesta del BCCR no tiene la forma esperada."""


class Fila(NamedTuple):
    fecha: date
    valor: float | None


def parsear(respuesta: dict) -> list[Fila]:
    """Extrae las filas de una respuesta de /indicadoresEconomicos/{codigo}/series."""
    if not isinstance(respuesta, dict) or respuesta.get("estado") is not True:
        raise ErrorParseo("La respuesta del BCCR no indica éxito")
    datos = respuesta.get("datos")
    if not isinstance(datos, list):
        raise ErrorParseo("La respuesta del BCCR no trae la lista 'datos'")
    filas: list[Fila] = []
    for indicador in datos:
        for punto in indicador.get("series", []):
            try:
                fecha = date.fromisoformat(str(punto["fecha"])[:10])
            except (KeyError, ValueError) as error:
                raise ErrorParseo("Fecha ausente o inválida en la serie") from error
            valor = punto.get("valorDatoPorPeriodo")
            filas.append(Fila(fecha, None if valor is None else valor))
    return filas
