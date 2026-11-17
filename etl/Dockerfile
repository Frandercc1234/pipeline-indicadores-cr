# Imagen del ETL para docker compose (perfil "etl"). Incluye los fixtures para el modo simulado.
FROM python:3.12.10-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY etl ./etl
COPY indicadores.yaml ./
COPY tests/fixtures ./tests/fixtures
RUN useradd --system --no-create-home etl
USER etl
ENTRYPOINT ["python", "-m", "etl"]
