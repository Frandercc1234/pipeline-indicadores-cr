"""CLI del ETL: python -m etl <comando>."""

import argparse
import sys
from datetime import date

from etl.cargas import backfill, diario, validar
from etl.migrar import migrar


def _fecha(texto: str) -> date:
    try:
        return date.fromisoformat(texto)
    except ValueError as error:
        raise argparse.ArgumentTypeError(f"fecha inválida '{texto}' (use YYYY-MM-DD)") from error


def main() -> int:
    parser = argparse.ArgumentParser(prog="etl", description="ETL de indicadores del BCCR")
    comandos = parser.add_subparsers(dest="comando", required=True)
    comandos.add_parser("migrar", help="Aplica las migraciones y siembra indicador")
    carga = comandos.add_parser("backfill", help="Carga histórica por tramos anuales")
    carga.add_argument("--desde", type=_fecha, default=date(2015, 1, 1))
    carga.add_argument("--hasta", type=_fecha, default=None)
    carga.add_argument("--slug", default=None)
    comandos.add_parser("diario", help="Pide los últimos 60 días de cada indicador activo")
    comprobar = comandos.add_parser("validar", help="Compara una muestra contra el BCCR")
    comprobar.add_argument("--muestras", type=int, default=15)
    args = parser.parse_args()
    if args.comando == "migrar":
        return migrar()
    if args.comando == "backfill":
        return backfill(args.desde, args.hasta, args.slug)
    if args.comando == "diario":
        return diario()
    return validar(args.muestras)


if __name__ == "__main__":
    sys.exit(main())
