"""SQL del ETL: upsert de observaciones, registro de cargas y de revisiones."""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

import psycopg
from psycopg.types.json import Jsonb

from etl.parser import Fila
from etl.validaciones import Indicador

CUATRO_DECIMALES = Decimal("0.0001")

UPSERT_OBSERVACION = """
INSERT INTO observacion (indicador_id, fecha, valor, carga_id)
VALUES (%s, %s, %s, %s)
ON CONFLICT (indicador_id, fecha) DO UPDATE SET
  valor = EXCLUDED.valor,
  carga_id = EXCLUDED.carga_id,
  actualizado_en = now()
WHERE observacion.valor <> EXCLUDED.valor
"""

INSERTAR_REVISION = """
INSERT INTO revision (indicador_id, fecha, valor_anterior, valor_nuevo, carga_id)
VALUES (%s, %s, %s, %s, %s)
"""


def a_decimal(valor: float) -> Decimal:
    """Convierte al mismo redondeo de la columna numeric(14,4)."""
    return Decimal(str(valor)).quantize(CUATRO_DECIMALES, rounding=ROUND_HALF_UP)


def listar_indicadores(conn: psycopg.Connection, slug: str | None = None) -> list[Indicador]:
    consulta = (
        "SELECT id, slug, codigo_bccr, periodicidad, valor_min, valor_max "
        "FROM indicador WHERE activo AND (%s::text IS NULL OR slug = %s) ORDER BY id"
    )
    filas = conn.execute(consulta, (slug, slug)).fetchall()
    return [Indicador(i, s, c, p, float(mn), float(mx)) for i, s, c, p, mn, mx in filas]


def crear_carga(conn: psycopg.Connection, tipo: str, modo: str) -> int:
    carga_id = conn.execute(
        "INSERT INTO carga (tipo, modo) VALUES (%s, %s) RETURNING id", (tipo, modo)
    ).fetchone()[0]
    conn.commit()
    return carga_id


def cerrar_carga(
    conn: psycopg.Connection,
    carga_id: int,
    estado: str,
    insertadas: int = 0,
    actualizadas: int = 0,
    detalle: dict | None = None,
    error: str | None = None,
) -> None:
    conn.execute(
        "UPDATE carga SET fin = now(), estado = %s, filas_insertadas = %s, "
        "filas_actualizadas = %s, detalle = %s, error = %s WHERE id = %s",
        (estado, insertadas, actualizadas, Jsonb(detalle or {}), error, carga_id),
    )
    conn.commit()


def guardar_observaciones(
    conn: psycopg.Connection, indicador_id: int, carga_id: int, filas: list[Fila]
) -> tuple[int, int]:
    """Guarda un lote de un indicador en una transacción. Devuelve (insertadas, actualizadas).

    Si una fecha ya existe con otro valor, se registra en `revision` antes de actualizarla.
    """
    nuevos = {fila.fecha: a_decimal(fila.valor) for fila in filas}
    if not nuevos:
        return 0, 0
    try:
        existentes = dict(
            conn.execute(
                "SELECT fecha, valor FROM observacion WHERE indicador_id = %s AND fecha = ANY(%s)",
                (indicador_id, list(nuevos)),
            ).fetchall()
        )
        revisiones = [
            (indicador_id, fecha, existentes[fecha], valor, carga_id)
            for fecha, valor in nuevos.items()
            if fecha in existentes and existentes[fecha] != valor
        ]
        with conn.cursor() as cursor:
            if revisiones:
                cursor.executemany(INSERTAR_REVISION, revisiones)
            cursor.executemany(
                UPSERT_OBSERVACION,
                [(indicador_id, fecha, valor, carga_id) for fecha, valor in nuevos.items()],
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return len(nuevos) - len(existentes), len(revisiones)


def observaciones_de(conn: psycopg.Connection, indicador_id: int) -> list[tuple[date, Decimal]]:
    """Todas las observaciones guardadas de un indicador, de la más antigua a la más reciente."""
    return conn.execute(
        "SELECT fecha, valor FROM observacion WHERE indicador_id = %s ORDER BY fecha",
        (indicador_id,),
    ).fetchall()
