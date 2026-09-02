-- Migracion: corrige un bug de zona horaria en la tabla `sesiones`.
--
-- Las columnas expires_at/created_at estaban definidas como
-- `timestamp without time zone`. El driver node-postgres serializa los
-- objetos Date de JS usando la zona horaria LOCAL del proceso (no UTC) al
-- escribir en columnas sin timezone, mientras que NOW() en Postgres opera
-- en UTC. En un servidor con zona horaria distinta de UTC (p. ej. Colombia,
-- UTC-5), esto desalineaba expires_at con NOW() y hacia que las sesiones
-- parecieran expiradas horas antes de lo previsto, forzando a la app a
-- caer en datos de perfil incompletos (solo email, sin nombre/telefono/etc).
--
-- Solucion: usar TIMESTAMPTZ, que normaliza todo a UTC sin importar la
-- zona horaria del proceso que escribe.

ALTER TABLE sesiones
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE sesiones
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
