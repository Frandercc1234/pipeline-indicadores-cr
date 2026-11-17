from pathlib import Path

import pytest

CARPETA_FIXTURES = Path(__file__).parent / "fixtures"
SLUGS = ["tc_compra", "tc_venta", "ipc_indice", "ipc_interanual", "tbp", "tpm"]


@pytest.fixture
def fixtures() -> Path:
    return CARPETA_FIXTURES
