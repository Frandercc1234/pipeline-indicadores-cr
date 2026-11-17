"""Orquesta los comandos backfill, diario y validar."""

import random
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date, timedelta
from decimal import Decimal
from time import perf_counter

import psycopg

from etl.bccr_cliente import ClienteBccr, ErrorBccr
from etl.config import registrar, requerir
from etl.parser import ErrorParseo
from etl.repositorio import (
    a_decimal,
    cerrar_carga,
    crear_carga,
    guardar_observaciones,
    listar_indicadores,
    observaciones_de,
)
from etl.simulado import ClienteSimulado
from etl.validaciones import (
    ADELANTO_MAXIMO_DIAS,
    detectar_huecos,
    hoy_cr,
    validar_lote,
)

DIAS_VENTANA_DIARIA = 60
CONECTAR_TIMEOUT_S = 10
TOLERANCIA = Decimal("0.0001")
MAX_DETALLES = 100  # tope de filas rechazadas o diferencias guardadas en carga.detalle


def _leer_modo() -> str:
    modo = requerir("BCCR_MODO")["BCCR_MODO"]
    if modo not in ("real", "simulado"):
        registrar("error", "modo_invalido", modo=modo)
        sys.exit(1)
    return modo


@contextmanager
def sesion() -> Iterator[tuple[str, object, psycopg.Connection]]:
    """Abre el cliente (real o simulado) y la conexión a la base con el rol etl_writer."""
    modo = _leer_modo()
    claves = ["DATABASE_URL_ETL"] + (["BCCR_TOKEN", "BCCR_BASE_URL"] if modo == "real" else [])
    config = requerir(*claves)
    cliente = (
        ClienteBccr(config["BCCR_BASE_URL"], config["BCCR_TOKEN"])
        if modo == "real"
        else ClienteSimulado()
    )
    try:
        conn = psycopg.connect(config["DATABASE_URL_ETL"], connect_timeout=CONECTAR_TIMEOUT_S)
    except psycopg.Error as error:
        registrar("error", "conexion_fallo", tipo=type(error).__name__)
        cliente.cerrar()
        sys.exit(1)
    try:
        yield modo, cliente, conn
    finally:
        cliente.cerrar()
        conn.close()


def _texto_error(error: Exception) -> str:
    return f"{type(error).__name__}: {str(error)[:300]}"


def _cargar(tipo: str, desde: date, hasta: date, hoy: date, slug: str | None = None) -> int:
    """Pide, valida y guarda las series. Códigos de salida: 0 ok, 1 error, 2 parcial."""
    with sesion() as (modo, cliente, conn):
        indicadores = listar_indicadores(conn, slug)
        if not indicadores:
            registrar("error", "sin_indicadores", slug=slug)
            return 1
        carga_id = crear_carga(conn, tipo, modo)
        detalle: dict = {"indicadores": {}, "rechazadas": [], "rechazadas_total": 0}
        insertadas = actualizadas = 0
        hubo_error = False
        try:
            for indicador in indicadores:
                inicio = perf_counter()
                try:
                    filas = cliente.serie(indicador.slug, indicador.codigo_bccr, desde, hasta)
                except (ErrorBccr, ErrorParseo) as error:
                    hubo_error = True
                    detalle["indicadores"][indicador.slug] = {"error": str(error)}
                    registrar("error", "indicador_fallo", slug=indicador.slug, error=str(error))
                    continue
                resultado = validar_lote(indicador, filas, hoy)
                nuevas, cambiadas = guardar_observaciones(
                    conn, indicador.id, carga_id, resultado.validas
                )
                insertadas += nuevas
                actualizadas += cambiadas
                detalle["rechazadas_total"] += len(resultado.rechazadas)
                for rechazada in resultado.rechazadas:
                    if len(detalle["rechazadas"]) < MAX_DETALLES:
                        detalle["rechazadas"].append({"slug": indicador.slug, **rechazada})
                detalle["indicadores"][indicador.slug] = {
                    "recibidas": len(filas),
                    "insertadas": nuevas,
                    "actualizadas": cambiadas,
                    "rechazadas": len(resultado.rechazadas),
                }
                registrar(
                    "info",
                    "indicador_cargado",
                    slug=indicador.slug,
                    filas=len(resultado.validas),
                    duracion_ms=round((perf_counter() - inicio) * 1000),
                )
        except Exception as error:
            conn.rollback()
            cerrar_carga(
                conn, carga_id, "error", insertadas, actualizadas, detalle, _texto_error(error)
            )
            registrar("error", "carga_fallo", tipo=tipo, error=type(error).__name__)
            return 1
        if hubo_error:
            estado, codigo = "error", 1
        elif detalle["rechazadas_total"] > 0:
            estado, codigo = "parcial", 2
        else:
            estado, codigo = "ok", 0
        cerrar_carga(conn, carga_id, estado, insertadas, actualizadas, detalle)
        registrar(
            "info",
            "carga_terminada",
            tipo=tipo,
            estado=estado,
            filas=insertadas + actualizadas,
            insertadas=insertadas,
            actualizadas=actualizadas,
        )
        return codigo


def backfill(desde: date, hasta: date | None = None, slug: str | None = None) -> int:
    hoy = hoy_cr()
    return _cargar("backfill", desde, hasta or hoy, hoy, slug)


def diario(hoy: date | None = None) -> int:
    """Pide los últimos 60 días para recoger publicaciones nuevas y correcciones."""
    hoy = hoy or hoy_cr()
    desde = hoy - timedelta(days=DIAS_VENTANA_DIARIA)
    return _cargar("diaria", desde, hoy + timedelta(days=ADELANTO_MAXIMO_DIAS), hoy)


def validar(muestras: int = 15, azar: random.Random | None = None) -> int:
    """Compara una muestra de la base contra la fuente. 0 si todo coincide, 1 si no."""
    azar = azar or random.Random()
    with sesion() as (modo, cliente, conn):
        indicadores = listar_indicadores(conn)
        carga_id = crear_carga(conn, "validacion", modo)
        detalle: dict = {"muestras": {}, "diferencias": [], "diferencias_total": 0, "huecos": {}}
        try:
            for indicador in indicadores:
                inicio = perf_counter()
                observaciones = observaciones_de(conn, indicador.id)
                diferencias = _comparar(cliente, indicador, observaciones, muestras, azar, detalle)
                detalle["diferencias_total"] += len(diferencias)
                for diferencia in diferencias:
                    if len(detalle["diferencias"]) < MAX_DETALLES:
                        detalle["diferencias"].append(diferencia)
                huecos = detectar_huecos(indicador.periodicidad, [f for f, _ in observaciones])
                if huecos:
                    detalle["huecos"][indicador.slug] = huecos[:MAX_DETALLES]
                registrar(
                    "info",
                    "indicador_validado",
                    slug=indicador.slug,
                    filas=detalle["muestras"].get(indicador.slug, 0),
                    duracion_ms=round((perf_counter() - inicio) * 1000),
                )
        except Exception as error:
            conn.rollback()
            cerrar_carga(conn, carga_id, "error", 0, 0, detalle, _texto_error(error))
            registrar("error", "validacion_fallo", error=type(error).__name__)
            return 1
        coincide = detalle["diferencias_total"] == 0
        cerrar_carga(conn, carga_id, "ok" if coincide else "error", 0, 0, detalle)
        registrar(
            "info" if coincide else "error",
            "validacion_terminada",
            diferencias=detalle["diferencias_total"],
            huecos=len(detalle["huecos"]),
        )
        return 0 if coincide else 1


def _comparar(cliente, indicador, observaciones, muestras, azar, detalle) -> list[dict]:
    """Vuelve a pedir a la fuente las fechas de la muestra y compara con la base."""
    slug = indicador.slug
    if not observaciones:
        return [{"slug": slug, "motivo": "sin_datos_en_la_base"}]
    cantidad_recientes = min(5, muestras)
    recientes = observaciones[-cantidad_recientes:]
    ultima = observaciones[-1][0]
    candidatas = [
        o for o in observaciones[:-cantidad_recientes] if o[0] >= ultima - timedelta(days=730)
    ]
    al_azar = azar.sample(candidatas, min(len(candidatas), max(muestras - 5, 0)))
    muestra = recientes + al_azar
    detalle["muestras"][slug] = len(muestra)
    fechas = [fecha for fecha, _ in muestra]
    try:
        fuente = {
            fila.fecha: fila.valor
            for fila in cliente.serie(slug, indicador.codigo_bccr, min(fechas), max(fechas))
        }
    except (ErrorBccr, ErrorParseo) as error:
        return [{"slug": slug, "motivo": "error_al_consultar_la_fuente", "mensaje": str(error)}]
    diferencias = []
    for fecha, valor_base in muestra:
        valor_fuente = fuente.get(fecha)
        if valor_fuente is None:
            diferencias.append(
                {"slug": slug, "fecha": fecha.isoformat(), "motivo": "ausente_en_la_fuente"}
            )
        elif abs(valor_base - a_decimal(valor_fuente)) > TOLERANCIA:
            diferencias.append(
                {
                    "slug": slug,
                    "fecha": fecha.isoformat(),
                    "motivo": "valor_distinto",
                    "valor_base": float(valor_base),
                    "valor_fuente": valor_fuente,
                }
            )
    return diferencias
