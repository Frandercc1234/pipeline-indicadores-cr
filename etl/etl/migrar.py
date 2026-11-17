"""Aplica db/migrations y siembra la tabla indicador desde indicadores.yaml."""

import psycopg
import yaml

from etl.config import CARPETA_ETL, RAIZ_REPO, registrar, requerir

MIGRACIONES = RAIZ_REPO / "db" / "migrations"

UPSERT_INDICADOR = """
INSERT INTO indicador (slug, codigo_bccr, nombre, unidad, periodicidad, valor_min, valor_max)
VALUES (%(slug)s, %(codigo_bccr)s, %(nombre)s, %(unidad)s, %(periodicidad)s,
        %(valor_min)s, %(valor_max)s)
ON CONFLICT (slug) DO UPDATE SET
  codigo_bccr = EXCLUDED.codigo_bccr,
  nombre = EXCLUDED.nombre,
  unidad = EXCLUDED.unidad,
  periodicidad = EXCLUDED.periodicidad,
  valor_min = EXCLUDED.valor_min,
  valor_max = EXCLUDED.valor_max
"""


def aplicar_migraciones(conn: psycopg.Connection) -> list[str]:
    existe = conn.execute("SELECT to_regclass('public.schema_migraciones')").fetchone()[0]
    aplicadas: set[str] = set()
    if existe:
        aplicadas = {fila[0] for fila in conn.execute("SELECT version FROM schema_migraciones")}
    nuevas = []
    for archivo in sorted(MIGRACIONES.glob("*.sql")):
        if archivo.stem in aplicadas:
            continue
        conn.execute(archivo.read_text(encoding="utf-8"))
        conn.execute("INSERT INTO schema_migraciones (version) VALUES (%s)", (archivo.stem,))
        conn.commit()
        nuevas.append(archivo.stem)
        registrar("info", "migracion_aplicada", version=archivo.stem)
    return nuevas


def sembrar_indicadores(conn: psycopg.Connection) -> int:
    indicadores = yaml.safe_load((CARPETA_ETL / "indicadores.yaml").read_text(encoding="utf-8"))
    for indicador in indicadores:
        conn.execute(UPSERT_INDICADOR, indicador)
    conn.commit()
    return len(indicadores)


def migrar() -> int:
    url = requerir("DATABASE_URL_ADMIN")["DATABASE_URL_ADMIN"]
    try:
        with psycopg.connect(url) as conn:
            nuevas = aplicar_migraciones(conn)
            sembrados = sembrar_indicadores(conn)
    except psycopg.Error as error:
        registrar("error", "migrar_fallo", tipo=type(error).__name__)
        return 1
    registrar("info", "migrar_ok", migraciones_nuevas=len(nuevas), indicadores=sembrados)
    return 0
