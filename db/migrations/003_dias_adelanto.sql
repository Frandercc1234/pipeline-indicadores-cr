-- Días por delante de "hoy" (hora de Costa Rica) con los que el BCCR publica cada indicador.
-- La validación acepta fecha <= hoy + dias_adelanto. Se siembra desde etl/indicadores.yaml.
ALTER TABLE indicador
  ADD COLUMN dias_adelanto smallint NOT NULL DEFAULT 0 CHECK (dias_adelanto >= 0);
