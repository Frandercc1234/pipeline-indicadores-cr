import json
from datetime import date

import httpx
import pytest

from etl.bccr_cliente import ClienteBccr, ErrorBccr, tramos_anuales

BASE = "https://bccr.example.test/api"
TOKEN = "TOKEN-DE-PRUEBA-NO-REAL-123"
RUTA = f"{BASE}/indicadoresEconomicos/317/series"
DESDE, HASTA = date(2024, 1, 1), date(2024, 6, 30)


@pytest.fixture
def respuesta_real(fixtures):
    return json.loads((fixtures / "tc_compra.json").read_text(encoding="utf-8"))


@pytest.fixture
def cliente():
    pausas = []
    c = ClienteBccr(BASE, TOKEN, dormir=pausas.append)
    c.pausas = pausas
    yield c
    c.cerrar()


def test_tramos_anuales_un_solo_tramo():
    assert tramos_anuales(DESDE, HASTA) == [(DESDE, HASTA)]


def test_tramos_anuales_parte_pedidos_largos_sin_solapar():
    tramos = tramos_anuales(date(2015, 1, 1), date(2017, 6, 30))
    assert len(tramos) == 3
    assert tramos[0][0] == date(2015, 1, 1) and tramos[-1][1] == date(2017, 6, 30)
    for (_, fin), (inicio, _) in zip(tramos, tramos[1:], strict=False):
        assert (inicio - fin).days == 1
    assert all((fin - inicio).days < 365 for inicio, fin in tramos)


def test_tramos_anuales_rango_invertido_es_vacio():
    assert tramos_anuales(date(2024, 2, 1), date(2024, 1, 1)) == []


def test_peticion_correcta(cliente, respx_mock, respuesta_real):
    ruta = respx_mock.get(RUTA).mock(return_value=httpx.Response(200, json=respuesta_real))
    filas = cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert len(filas) > 0
    peticion = ruta.calls.last.request
    assert peticion.headers["Authorization"] == f"Bearer {TOKEN}"
    assert "%2F" in str(peticion.url)
    assert peticion.url.params["fechaInicio"] == "2024/01/01"
    assert peticion.url.params["fechaFin"] == "2024/06/30"
    assert peticion.url.params["idioma"] == "ES"
    assert TOKEN not in str(peticion.url)


def test_pedido_de_varios_anios_hace_un_pedido_por_tramo(cliente, respx_mock, respuesta_real):
    ruta = respx_mock.get(RUTA).mock(return_value=httpx.Response(200, json=respuesta_real))
    cliente.serie("tc_compra", 317, date(2015, 1, 1), date(2017, 6, 30))
    assert ruta.call_count == 3


def test_reintenta_ante_503_y_termina_bien(cliente, respx_mock, respuesta_real):
    ruta = respx_mock.get(RUTA).mock(
        side_effect=[
            httpx.Response(503),
            httpx.Response(503),
            httpx.Response(200, json=respuesta_real),
        ]
    )
    assert len(cliente.serie("tc_compra", 317, DESDE, HASTA)) > 0
    assert ruta.call_count == 3
    assert cliente.pausas == [2, 4]


def test_se_rinde_tras_tres_intentos(cliente, respx_mock):
    ruta = respx_mock.get(RUTA).mock(return_value=httpx.Response(503))
    with pytest.raises(ErrorBccr) as error:
        cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert ruta.call_count == 3
    assert error.value.estado == 503


def test_reintenta_ante_429(cliente, respx_mock, respuesta_real):
    ruta = respx_mock.get(RUTA).mock(
        side_effect=[httpx.Response(429), httpx.Response(200, json=respuesta_real)]
    )
    cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert ruta.call_count == 2


def test_reintenta_ante_timeout(cliente, respx_mock, respuesta_real):
    ruta = respx_mock.get(RUTA).mock(
        side_effect=[httpx.ReadTimeout("lento"), httpx.Response(200, json=respuesta_real)]
    )
    cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert ruta.call_count == 2


def test_reintenta_ante_error_de_conexion(cliente, respx_mock):
    ruta = respx_mock.get(RUTA).mock(side_effect=httpx.ConnectError("sin red"))
    with pytest.raises(ErrorBccr):
        cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert ruta.call_count == 3


@pytest.mark.parametrize("estado", [400, 401, 403])
def test_no_reintenta_ante_errores_del_cliente(estado, cliente, respx_mock):
    ruta = respx_mock.get(RUTA).mock(
        return_value=httpx.Response(estado, json={"CodigoError": str(estado), "Mensaje": "No"})
    )
    with pytest.raises(ErrorBccr) as error:
        cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert ruta.call_count == 1
    assert error.value.estado == estado
    assert cliente.pausas == []


def test_el_token_no_aparece_en_errores_ni_en_logs(cliente, respx_mock, capsys):
    respx_mock.get(RUTA).mock(
        side_effect=[
            httpx.Response(503),
            httpx.Response(401, json={"Mensaje": "Acceso denegado"}),
        ]
    )
    with pytest.raises(ErrorBccr) as error:
        cliente.serie("tc_compra", 317, DESDE, HASTA)
    salida = capsys.readouterr()
    assert TOKEN not in str(error.value) and TOKEN not in repr(error.value)
    assert TOKEN not in salida.out and TOKEN not in salida.err
    assert "Authorization" not in str(error.value)


def test_error_de_conexion_no_filtra_el_token(cliente, respx_mock):
    respx_mock.get(RUTA).mock(side_effect=httpx.ConnectError(f"fallo con {TOKEN}"))
    with pytest.raises(ErrorBccr) as error:
        cliente.serie("tc_compra", 317, DESDE, HASTA)
    assert TOKEN not in str(error.value)
