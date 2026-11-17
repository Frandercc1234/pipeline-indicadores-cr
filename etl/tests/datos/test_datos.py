"""Pruebas SQL sobre la base ya cargada (corren después de un backfill)."""

from datetime import date, timedelta

import pytest
import yaml

from etl.cargas import diario
from etl.config import CARPETA_ETL
from etl.simulado import ClienteSimulado
from etl.validaciones import hoy_cr


def _catalogo() -> list[dict]:
    return yaml.safe_load((CARPETA_ETL / "indicadores.yaml").read_text(encoding="utf-8"))


def _exigir_base_local(conn) -> None:
    """Las pruebas que escriben una carga simulada nunca deben correr contra Neon."""
    host = conn.info.host
    if host not in ("localhost", "127.0.0.1", "db"):
        pytest.skip(f"solo corre contra la base local, no contra {host}")


def test_no_hay_fechas_repetidas_por_indicador(conn):
    repetidas = conn.execute(
        "SELECT indicador_id, fecha FROM observacion "
        "GROUP BY indicador_id, fecha HAVING count(*) > 1"
    ).fetchall()
    assert repetidas == []


def test_ningun_valor_esta_fuera_del_rango_de_su_indicador(conn):
    fuera = conn.execute(
        "SELECT i.slug, o.fecha, o.valor FROM observacion o "
        "JOIN indicador i ON i.id = o.indicador_id "
        "WHERE o.valor < i.valor_min OR o.valor > i.valor_max"
    ).fetchall()
    assert fuera == []


def test_no_hay_fechas_mas_alla_de_hoy_mas_el_adelanto_de_su_indicador(conn):
    futuras = conn.execute(
        "SELECT i.slug, o.fecha FROM observacion o "
        "JOIN indicador i ON i.id = o.indicador_id "
        "WHERE o.fecha > %s::date + i.dias_adelanto",
        (hoy_cr(),),
    ).fetchall()
    assert futuras == []


def test_dias_adelanto_se_sembro_desde_el_yaml(conn):
    esperado = {i["slug"]: i["dias_adelanto"] for i in _catalogo()}
    en_base = dict(conn.execute("SELECT slug, dias_adelanto FROM indicador").fetchall())
    assert en_base == esperado


def test_no_hay_fechas_anteriores_a_2015(conn):
    antiguas = conn.execute(
        "SELECT indicador_id, fecha FROM observacion WHERE fecha < %s", (date(2015, 1, 1),)
    ).fetchall()
    assert antiguas == []


def test_toda_observacion_apunta_a_una_carga_existente(conn):
    huerfanas = conn.execute(
        "SELECT o.indicador_id, o.fecha FROM observacion o "
        "LEFT JOIN carga c ON c.id = o.carga_id WHERE c.id IS NULL"
    ).fetchall()
    assert huerfanas == []


def test_cada_indicador_tiene_al_menos_una_fila(conn):
    sin_datos = conn.execute(
        "SELECT i.slug FROM indicador i "
        "LEFT JOIN observacion o ON o.indicador_id = i.id "
        "WHERE i.activo GROUP BY i.slug HAVING count(o.fecha) = 0"
    ).fetchall()
    assert sin_datos == []


def _ultima_carga(conn, tipo):
    return conn.execute(
        "SELECT estado, filas_insertadas, filas_actualizadas FROM carga "
        "WHERE tipo = %s ORDER BY id DESC LIMIT 1",
        (tipo,),
    ).fetchone()


def test_diario_pide_hasta_hoy_mas_el_adelanto_de_cada_indicador(conn, monkeypatch):
    _exigir_base_local(conn)
    pedidos = {}
    original = ClienteSimulado.serie

    def espia(self, slug, codigo, desde, hasta):
        pedidos[slug] = hasta
        return original(self, slug, codigo, desde, hasta)

    monkeypatch.setattr(ClienteSimulado, "serie", espia)
    hoy = date(2024, 6, 30)
    assert diario(hoy=hoy) == 0
    esperado = {i["slug"]: hoy + timedelta(days=i["dias_adelanto"]) for i in _catalogo()}
    assert pedidos == esperado


def test_diario_es_idempotente_en_simulado(conn):
    _exigir_base_local(conn)
    # Con "hoy" dentro de la ventana de los fixtures, el diario sí encuentra filas.
    assert diario(hoy=date(2024, 6, 30)) == 0
    assert diario(hoy=date(2024, 6, 30)) == 0
    estado, insertadas, actualizadas = _ultima_carga(conn, "diaria")
    assert (estado, insertadas, actualizadas) == ("ok", 0, 0)
