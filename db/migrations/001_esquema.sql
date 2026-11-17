CREATE TABLE schema_migraciones (
  version     text PRIMARY KEY,
  aplicado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE indicador (
  id           smallserial PRIMARY KEY,
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z_]+$'),
  codigo_bccr  integer NOT NULL UNIQUE CHECK (codigo_bccr > 0),
  nombre       text NOT NULL,
  unidad       text NOT NULL,
  periodicidad text NOT NULL CHECK (periodicidad IN ('diaria', 'semanal', 'mensual', 'irregular')),
  valor_min    numeric(14,4) NOT NULL,
  valor_max    numeric(14,4) NOT NULL,
  activo       boolean NOT NULL DEFAULT true,
  CHECK (valor_min < valor_max)
);

CREATE TABLE carga (
  id                 bigserial PRIMARY KEY,
  tipo               text NOT NULL CHECK (tipo IN ('diaria', 'backfill', 'validacion')),
  modo               text NOT NULL CHECK (modo IN ('real', 'simulado')),
  inicio             timestamptz NOT NULL DEFAULT now(),
  fin                timestamptz,
  estado             text NOT NULL DEFAULT 'en_curso'
                     CHECK (estado IN ('en_curso', 'ok', 'parcial', 'error')),
  filas_insertadas   integer NOT NULL DEFAULT 0 CHECK (filas_insertadas >= 0),
  filas_actualizadas integer NOT NULL DEFAULT 0 CHECK (filas_actualizadas >= 0),
  detalle            jsonb NOT NULL DEFAULT '{}'::jsonb,
  error              text,
  CHECK (fin IS NULL OR fin >= inicio)
);
CREATE INDEX carga_estado_inicio_idx ON carga (estado, inicio DESC);

CREATE TABLE observacion (
  indicador_id   smallint NOT NULL REFERENCES indicador(id) ON DELETE RESTRICT,
  fecha          date NOT NULL CHECK (fecha >= DATE '2015-01-01'),
  valor          numeric(14,4) NOT NULL,
  carga_id       bigint NOT NULL REFERENCES carga(id) ON DELETE RESTRICT,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (indicador_id, fecha)
);
CREATE INDEX observacion_fecha_idx ON observacion (fecha);

-- Cuando el BCCR corrige un valor ya guardado, se registra aquí antes de actualizarlo.
CREATE TABLE revision (
  id             bigserial PRIMARY KEY,
  indicador_id   smallint NOT NULL REFERENCES indicador(id) ON DELETE RESTRICT,
  fecha          date NOT NULL,
  valor_anterior numeric(14,4) NOT NULL,
  valor_nuevo    numeric(14,4) NOT NULL,
  carga_id       bigint NOT NULL REFERENCES carga(id) ON DELETE RESTRICT,
  detectado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK (valor_anterior <> valor_nuevo)
);
CREATE INDEX revision_indicador_fecha_idx ON revision (indicador_id, fecha);
