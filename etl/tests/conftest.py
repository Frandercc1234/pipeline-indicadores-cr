from pathlib import Path

import pytest

CARPETA_FIXTURES = Path(__file__).parent / "fixtures"
SLUGS = ["tc_compra", "tc_venta", "ipc_indice", "ipc_interanual", "tbp", "tpm"]


@pytest.fixture(autouse=True)
def modo_simulado(monkeypatch):
    """Las pruebas nunca llaman al BCCR real, aunque etl/.env diga BCCR_MODO=real."""
    monkeypatch.setenv("BCCR_MODO", "simulado")


@pytest.fixture
def fixtures() -> Path:
    return CARPETA_FIXTURES
