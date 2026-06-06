-- backend/scripts/migrate_tendero_pk.sql
-- Migracion: id_tendero pasa de BIGINT a VARCHAR(50)
-- Los registros existentes se mantienen con su valor convertido a string.

BEGIN;

-- 1. Eliminar las llaves foraneas que apuntan a tenderos.id_tendero
ALTER TABLE tendero_cliente DROP CONSTRAINT IF EXISTS tendero_cliente_id_tendero_fkey;
ALTER TABLE creditos       DROP CONSTRAINT IF EXISTS creditos_id_tendero_fkey;
ALTER TABLE metricas_cartera DROP CONSTRAINT IF EXISTS metricas_cartera_id_tendero_fkey;
ALTER TABLE alertas        DROP CONSTRAINT IF EXISTS alertas_id_tendero_fkey;
ALTER TABLE recordatorios  DROP CONSTRAINT IF EXISTS recordatorios_id_tendero_fkey;

-- 2. Eliminar la PK actual de tenderos
ALTER TABLE tenderos DROP CONSTRAINT IF EXISTS tenderos_pkey;

-- 3. Cambiar el tipo de id_tendero a VARCHAR(50)
ALTER TABLE tenderos ALTER COLUMN id_tendero TYPE VARCHAR(50);

-- 4. Recrear la PK con el nuevo tipo
ALTER TABLE tenderos ADD PRIMARY KEY (id_tendero);

-- 5. Cambiar el tipo en las tablas relacionadas
ALTER TABLE creditos       ALTER COLUMN id_tendero TYPE VARCHAR(50);
ALTER TABLE tendero_cliente ALTER COLUMN id_tendero TYPE VARCHAR(50);
ALTER TABLE metricas_cartera ALTER COLUMN id_tendero TYPE VARCHAR(50);
ALTER TABLE alertas        ALTER COLUMN id_tendero TYPE VARCHAR(50);
ALTER TABLE recordatorios  ALTER COLUMN id_tendero TYPE VARCHAR(50);

-- 6. Recrear las llaves foraneas
ALTER TABLE tendero_cliente ADD CONSTRAINT tendero_cliente_id_tendero_fkey FOREIGN KEY (id_tendero) REFERENCES tenderos(id_tendero);
ALTER TABLE creditos       ADD CONSTRAINT creditos_id_tendero_fkey       FOREIGN KEY (id_tendero) REFERENCES tenderos(id_tendero);
ALTER TABLE metricas_cartera ADD CONSTRAINT metricas_cartera_id_tendero_fkey FOREIGN KEY (id_tendero) REFERENCES tenderos(id_tendero);
ALTER TABLE alertas        ADD CONSTRAINT alertas_id_tendero_fkey        FOREIGN KEY (id_tendero) REFERENCES tenderos(id_tendero);
ALTER TABLE recordatorios  ADD CONSTRAINT recordatorios_id_tendero_fkey  FOREIGN KEY (id_tendero) REFERENCES tenderos(id_tendero);

COMMIT;
