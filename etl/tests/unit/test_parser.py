import json
from datetime import date

import pytest

from etl.parser import ErrorParseo, Fila, parsear
from tests.conftest import SLUGS


@pytest.mark.parametrize("slug", SLUGS)
def test_parsea_cada_fixture_real(slug, fixtures):
    crudo = json.loads((fixtures / f"{slug}.json").read_text(encoding="utf-8"))
    filas = parsear(crudo)
    esperadas = sum(len(d["series"]) for d in crudo["datos"])
    assert len(filas) == esperadas > 0
    assert all(isinstance(f, Fila) for f in filas)
    assert all(date(2024, 1, 1) <= f.fecha <= date(2024, 6, 30) for f in filas)
    assert all(f.valor is None or isinstance(f.valor, float) for f in filas)


@pytest.mark.parametrize("slug", SLUGS)
def test_fechas_sin_repetir_y_ordenadas(slug, fixtures):
    crudo = json.loads((fixtures / f"{slug}.json").read_text(encoding="utf-8"))
    fechas = [f.fecha for f in parsear(crudo)]
    assert fechas == sorted(set(fechas))


def test_valor_nulo_se_conserva_como_none():
    crudo = {
        "estado": True,
        "datos": [{"series": [{"fecha": "2024-01-02", "valorDatoPorPeriodo": None}]}],
    }
    assert parsear(crudo) == [Fila(date(2024, 1, 2), None)]


def test_datos_vacio_devuelve_lista_vacia():
    assert parsear({"estado": True, "mensaje": "Consulta exitosa", "datos": []}) == []


@pytest.mark.parametrize(
    "crudo",
    [
        {"estado": False, "datos": []},
        {"estado": True},
        {"estado": True, "datos": [{"series": [{"valorDatoPorPeriodo": 1.0}]}]},
        {
            "estado": True,
            "datos": [{"series": [{"fecha": "no-es-fecha", "valorDatoPorPeriodo": 1}]}],
        },
        [],
    ],
)
def test_respuestas_mal_formadas_fallan(crudo):
    with pytest.raises(ErrorParseo):
        parsear(crudo)
