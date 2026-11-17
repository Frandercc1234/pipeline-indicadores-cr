import socket
from datetime import date

import httpx
import pytest

from etl.simulado import ClienteSimulado
from tests.conftest import SLUGS


@pytest.fixture
def sin_red(monkeypatch):
    def prohibido(*args, **kwargs):
        raise AssertionError("El modo simulado no debe usar la red")

    monkeypatch.setattr(httpx.Client, "send", prohibido)
    monkeypatch.setattr(httpx.Client, "get", prohibido)
    monkeypatch.setattr(socket.socket, "connect", prohibido)


@pytest.mark.parametrize("slug", SLUGS)
def test_lee_fixture_y_no_toca_la_red(slug, sin_red):
    filas = ClienteSimulado().serie(slug, 0, date(2024, 1, 1), date(2024, 6, 30))
    assert len(filas) > 0


def test_filtra_por_fechas(sin_red):
    todas = ClienteSimulado().serie("tc_compra", 317, date(2024, 1, 1), date(2024, 6, 30))
    marzo = ClienteSimulado().serie("tc_compra", 317, date(2024, 3, 1), date(2024, 3, 31))
    assert 0 < len(marzo) < len(todas)
    assert all(date(2024, 3, 1) <= f.fecha <= date(2024, 3, 31) for f in marzo)


def test_fuera_del_rango_devuelve_vacio(sin_red):
    assert ClienteSimulado().serie("tpm", 3541, date(2030, 1, 1), date(2030, 1, 31)) == []
