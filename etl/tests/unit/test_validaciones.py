from datetime import date, datetime, timedelta, timezone

import pytest
import yaml

from etl.config import CARPETA_ETL
from etl.parser import Fila
from etl.validaciones import (
    FECHA_MINIMA,
    Indicador,
    detectar_huecos,
    hoy_cr,
    validar_lote,
)

HOY = date(2026, 11, 16)


def _indicador(slug: str) -> Indicador:
    """Toma el rango real del indicador desde indicadores.yaml."""
    catalogo = yaml.safe_load((CARPETA_ETL / "indicadores.yaml").read_text(encoding="utf-8"))
    datos = next(i for i in catalogo if i["slug"] == slug)
    return Indicador(
        id=1,
        slug=slug,
        codigo_bccr=datos["codigo_bccr"],
        periodicidad=datos["periodicidad"],
        valor_min=datos["valor_min"],
        valor_max=datos["valor_max"],
    )


@pytest.fixture
def tc() -> Indicador:
    return _indicador("tc_compra")


@pytest.fixture
def medio(tc) -> float:
    return (tc.valor_min + tc.valor_max) / 2


def test_fila_valida_pasa(tc, medio):
    resultado = validar_lote(tc, [Fila(date(2024, 1, 2), medio)], HOY)
    assert resultado.validas == [Fila(date(2024, 1, 2), medio)]
    assert resultado.rechazadas == []


@pytest.mark.parametrize("valor", [None, float("nan"), float("inf"), "abc", True])
def test_valor_nulo_o_no_numerico_se_descarta(tc, valor):
    resultado = validar_lote(tc, [Fila(date(2024, 1, 2), valor)], HOY)
    assert resultado.validas == []
    assert resultado.rechazadas[0]["motivo"] == "valor_nulo_o_no_numerico"


def test_limites_del_rango_son_inclusivos(tc):
    filas = [Fila(date(2024, 1, 2), tc.valor_min), Fila(date(2024, 1, 3), tc.valor_max)]
    assert len(validar_lote(tc, filas, HOY).validas) == 2


@pytest.mark.parametrize("delta", ["abajo", "arriba"])
def test_valor_fuera_de_rango_se_descarta(tc, delta):
    valor = tc.valor_min - 0.01 if delta == "abajo" else tc.valor_max + 0.01
    resultado = validar_lote(tc, [Fila(date(2024, 1, 2), valor)], HOY)
    assert resultado.validas == []
    assert resultado.rechazadas[0]["motivo"] == "fuera_de_rango"


def test_fecha_anterior_a_2015_se_descarta(tc, medio):
    antes = FECHA_MINIMA - timedelta(days=1)
    resultado = validar_lote(tc, [Fila(FECHA_MINIMA, medio), Fila(antes, medio)], HOY)
    assert [f.fecha for f in resultado.validas] == [FECHA_MINIMA]
    assert resultado.rechazadas[0]["motivo"] == "fecha_fuera_de_rango"


def test_acepta_hasta_hoy_mas_dos_dias_y_rechaza_hoy_mas_tres(tc, medio):
    filas = [Fila(HOY + timedelta(days=n), medio) for n in (0, 2, 3)]
    resultado = validar_lote(tc, filas, HOY)
    assert [f.fecha for f in resultado.validas] == [HOY, HOY + timedelta(days=2)]
    assert resultado.rechazadas[0]["fecha"] == (HOY + timedelta(days=3)).isoformat()


def test_fechas_duplicadas_descartan_el_lote_completo(tc, medio):
    filas = [
        Fila(date(2024, 1, 2), medio),
        Fila(date(2024, 1, 3), medio),
        Fila(date(2024, 1, 3), medio),
    ]
    resultado = validar_lote(tc, filas, HOY)
    assert resultado.validas == []
    assert resultado.rechazadas == [{"motivo": "fechas_duplicadas", "fechas": ["2024-01-03"]}]


def test_una_fila_mala_no_afecta_a_las_demas(tc, medio):
    filas = [Fila(date(2024, 1, 2), medio), Fila(date(2024, 1, 3), None)]
    resultado = validar_lote(tc, filas, HOY)
    assert len(resultado.validas) == 1 and len(resultado.rechazadas) == 1


def test_hoy_cr_usa_utc_menos_seis():
    madrugada_utc = datetime(2026, 11, 17, 3, 0, tzinfo=timezone.utc)
    assert hoy_cr(madrugada_utc) == date(2026, 11, 16)


def _dias(inicio: date, *saltos: int) -> list[date]:
    fechas = [inicio]
    for salto in saltos:
        fechas.append(fechas[-1] + timedelta(days=salto))
    return fechas


def test_hueco_diario_de_mas_de_4_dias_avisa():
    # 5 días sin dato entre dos fechas: el salto es de 6 días.
    huecos = detectar_huecos("diaria", _dias(date(2024, 1, 1), 1, 6))
    assert huecos == [{"desde": "2024-01-03", "hasta": "2024-01-07", "dias": 5}]


def test_hueco_diario_de_4_dias_no_avisa():
    assert detectar_huecos("diaria", _dias(date(2024, 1, 1), 1, 5)) == []


def test_hueco_semanal_y_mensual_usan_su_propio_umbral():
    assert len(detectar_huecos("semanal", _dias(date(2024, 1, 1), 12))) == 1
    assert detectar_huecos("semanal", _dias(date(2024, 1, 1), 11)) == []
    assert len(detectar_huecos("mensual", _dias(date(2024, 1, 31), 42))) == 1
    assert detectar_huecos("mensual", _dias(date(2024, 1, 31), 29, 31, 30)) == []


def test_periodicidad_irregular_no_se_revisa():
    assert detectar_huecos("irregular", _dias(date(2024, 1, 1), 400)) == []
