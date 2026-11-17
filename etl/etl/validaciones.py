"""Reglas de calidad por fila y por serie. Módulo puro: no toca la red ni la base."""

import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

from etl.parser import Fila

FECHA_MINIMA = date(2015, 1, 1)
# Costa Rica es UTC-6 todo el año (no usa horario de verano).
ZONA_COSTA_RICA = timezone(timedelta(hours=-6))
# Días seguidos sin dato a partir de los cuales se avisa de un hueco.
UMBRAL_HUECO_DIAS = {"diaria": 4, "semanal": 10, "mensual": 40}


@dataclass(frozen=True)
class Indicador:
    id: int
    slug: str
    codigo_bccr: int
    periodicidad: str
    valor_min: float
    valor_max: float
    # Días por delante de "hoy" con los que el BCCR publica este indicador.
    dias_adelanto: int


@dataclass
class Resultado:
    validas: list[Fila] = field(default_factory=list)
    rechazadas: list[dict] = field(default_factory=list)


def hoy_cr(ahora: datetime | None = None) -> date:
    """Fecha de hoy en Costa Rica."""
    ahora = ahora or datetime.now(timezone.utc)
    return ahora.astimezone(ZONA_COSTA_RICA).date()


def fecha_limite(indicador: Indicador, hoy: date) -> date:
    """Última fecha aceptada: hoy (hora de Costa Rica) más el adelanto del indicador."""
    return hoy + timedelta(days=indicador.dias_adelanto)


def _es_numero(valor) -> bool:
    return isinstance(valor, int | float) and not isinstance(valor, bool) and math.isfinite(valor)


def _motivo_rechazo(indicador: Indicador, fila: Fila, limite: date) -> str | None:
    if not _es_numero(fila.valor):
        return "valor_nulo_o_no_numerico"
    if not indicador.valor_min <= fila.valor <= indicador.valor_max:
        return "fuera_de_rango"
    if not FECHA_MINIMA <= fila.fecha <= limite:
        return "fecha_fuera_de_rango"
    return None


def validar_lote(indicador: Indicador, filas: list[Fila], hoy: date) -> Resultado:
    """Aplica las reglas a un lote de un indicador.

    Si hay fechas duplicadas se descarta el lote completo. Nunca se rellenan huecos.
    """
    conteo = Counter(fila.fecha for fila in filas)
    repetidas = sorted(fecha for fecha, veces in conteo.items() if veces > 1)
    if repetidas:
        motivo = {"motivo": "fechas_duplicadas", "fechas": [f.isoformat() for f in repetidas]}
        return Resultado(rechazadas=[motivo])
    limite = fecha_limite(indicador, hoy)
    resultado = Resultado()
    for fila in filas:
        motivo = _motivo_rechazo(indicador, fila, limite)
        if motivo is None:
            resultado.validas.append(fila)
        else:
            valor = fila.valor if _es_numero(fila.valor) else str(fila.valor)
            resultado.rechazadas.append(
                {"fecha": fila.fecha.isoformat(), "valor": valor, "motivo": motivo}
            )
    return resultado


def detectar_huecos(periodicidad: str, fechas: list[date]) -> list[dict]:
    """Tramos sin dato más largos que el umbral de la periodicidad. Solo advierte."""
    umbral = UMBRAL_HUECO_DIAS.get(periodicidad)
    if umbral is None:
        return []
    huecos = []
    ordenadas = sorted(fechas)
    for anterior, actual in zip(ordenadas, ordenadas[1:], strict=False):
        faltan = (actual - anterior).days - 1
        if faltan > umbral:
            huecos.append(
                {
                    "desde": (anterior + timedelta(days=1)).isoformat(),
                    "hasta": (actual - timedelta(days=1)).isoformat(),
                    "dias": faltan,
                }
            )
    return huecos
