"""CLI del ETL: python -m etl <comando>."""

import argparse
import sys

from etl.migrar import migrar


def main() -> int:
    parser = argparse.ArgumentParser(prog="etl", description="ETL de indicadores del BCCR")
    comandos = parser.add_subparsers(dest="comando", required=True)
    comandos.add_parser("migrar", help="Aplica las migraciones y siembra indicador")
    args = parser.parse_args()
    if args.comando == "migrar":
        return migrar()
    return 1


if __name__ == "__main__":
    sys.exit(main())
