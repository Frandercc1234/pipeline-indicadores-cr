"""Cliente de la API SDDE del BCCR con timeout, reintentos y tramos anuales."""

import time
from collections.abc import Callable
from datetime import date, timedelta

import httpx
from tenacity import Retrying, retry_if_exception, stop_after_attempt, wait_exponential

from etl.config import registrar
from etl.parser import Fila, parsear

USER_AGENT = "pipeline-indicadores-cr/1.0 (Mozilla/5.0 compatible)"
TIMEOUT_SEGUNDOS = 30
MAX_INTENTOS = 3
DIAS_POR_TRAMO = 365
PAUSA_ENTRE_TRAMOS_S = 1.5


class ErrorBccr(Exception):
    """Error al consultar el BCCR. El mensaje nunca incluye headers ni el cuerpo completo."""

    def __init__(self, mensaje: str, estado: int | None = None, reintentable: bool = False):
        super().__init__(mensaje)
        self.estado = estado
        self.reintentable = reintentable


def tramos_anuales(desde: date, hasta: date) -> list[tuple[date, date]]:
    """Parte [desde, hasta] en tramos de a lo sumo 365 días, sin solaparse."""
    tramos = []
    inicio = desde
    while inicio <= hasta:
        fin = min(hasta, inicio + timedelta(days=DIAS_POR_TRAMO - 1))
        tramos.append((inicio, fin))
        inicio = fin + timedelta(days=1)
    return tramos


def _resumir_error(respuesta: httpx.Response) -> str:
    """Código HTTP y mensaje corto, sin el cuerpo completo."""
    mensaje = ""
    try:
        cuerpo = respuesta.json()
        if isinstance(cuerpo, dict):
            mensaje = str(cuerpo.get("Mensaje") or cuerpo.get("mensaje") or "")[:200]
    except ValueError:
        pass
    return f"HTTP {respuesta.status_code} del BCCR. {mensaje}".strip()


class ClienteBccr:
    def __init__(
        self,
        base_url: str,
        token: str,
        dormir: Callable[[float], None] = time.sleep,
    ):
        self._base = base_url.rstrip("/")
        self._dormir = dormir
        self._http = httpx.Client(
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
            },
            timeout=TIMEOUT_SEGUNDOS,
        )

    def cerrar(self) -> None:
        self._http.close()

    def serie(self, slug: str, codigo: int, desde: date, hasta: date) -> list[Fila]:
        """Series del indicador entre dos fechas. `slug` solo lo usa el cliente simulado."""
        filas: list[Fila] = []
        for numero, (inicio, fin) in enumerate(tramos_anuales(desde, hasta)):
            if numero > 0:
                self._dormir(PAUSA_ENTRE_TRAMOS_S)  # el BCCR responde 429 si se le pide muy rápido
            filas.extend(self._pedir_tramo(codigo, inicio, fin))
        return filas

    def _pedir_tramo(self, codigo: int, desde: date, hasta: date) -> list[Fila]:
        reintentos = Retrying(
            retry=retry_if_exception(lambda e: isinstance(e, ErrorBccr) and e.reintentable),
            stop=stop_after_attempt(MAX_INTENTOS),
            wait=wait_exponential(multiplier=2, min=2, max=8),
            sleep=self._dormir,
            reraise=True,
            before_sleep=lambda estado: registrar(
                "warn", "bccr_reintento", codigo=codigo, intento=estado.attempt_number
            ),
        )
        return reintentos(self._una_peticion, codigo, desde, hasta)

    def _una_peticion(self, codigo: int, desde: date, hasta: date) -> list[Fila]:
        params = {
            "fechaInicio": desde.strftime("%Y/%m/%d"),
            "fechaFin": hasta.strftime("%Y/%m/%d"),
            "idioma": "ES",
        }
        try:
            respuesta = self._http.get(
                f"{self._base}/indicadoresEconomicos/{codigo}/series", params=params
            )
        except httpx.TransportError as error:
            raise ErrorBccr(
                f"{type(error).__name__} al consultar el BCCR", reintentable=True
            ) from None
        if respuesta.status_code == 200:
            return parsear(respuesta.json())
        reintentable = respuesta.status_code == 429 or respuesta.status_code >= 500
        raise ErrorBccr(
            _resumir_error(respuesta), estado=respuesta.status_code, reintentable=reintentable
        )
