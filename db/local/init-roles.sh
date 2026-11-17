#!/bin/sh
set -e
# Crea los roles de la aplicación en el Postgres local. Las contraseñas vienen del entorno.
psql -v ON_ERROR_STOP=1 -v etl_pw="$ETL_DB_PASSWORD" -v api_pw="$API_DB_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
CREATE ROLE etl_writer LOGIN PASSWORD :'etl_pw';
CREATE ROLE api_reader LOGIN PASSWORD :'api_pw';
EOSQL
