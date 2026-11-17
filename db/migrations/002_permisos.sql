REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO etl_writer, api_reader;

GRANT SELECT ON indicador, observacion, carga TO api_reader;

GRANT SELECT ON indicador TO etl_writer;
GRANT SELECT, INSERT, UPDATE ON observacion, carga TO etl_writer;
GRANT SELECT, INSERT ON revision TO etl_writer;
GRANT USAGE, SELECT ON SEQUENCE carga_id_seq, revision_id_seq TO etl_writer;
