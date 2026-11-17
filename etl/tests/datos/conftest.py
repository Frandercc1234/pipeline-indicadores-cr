import psycopg
import pytest

from etl.config import requerir


@pytest.fixture
def conn():
    """Conexión de solo consulta lógica a la base cargada, con el rol etl_writer."""
    url = requerir("DATABASE_URL_ETL")["DATABASE_URL_ETL"]
    with psycopg.connect(url) as conexion:
        yield conexion
