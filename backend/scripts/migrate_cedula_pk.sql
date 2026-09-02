-- backend/scripts/migrate_cedula_pk.sql
-- Migracion: id_cliente pasa de BIGINT a VARCHAR(50)
-- Los registros existentes se mantienen con su valor convertido a string.
-- Los nuevos clientes usaran su cedula real como id_cliente.

BEGIN;

-- 1. Eliminar las llaves foraneas que apuntan a clientes.id_cliente
ALTER TABLE tendero_cliente DROP CONSTRAINT IF EXISTS tendero_cliente_id_cliente_fkey;
ALTER TABLE creditos       DROP CONSTRAINT IF EXISTS creditos_id_cliente_fkey;
ALTER TABLE abonos         DROP CONSTRAINT IF EXISTS abonos_id_cliente_fkey;
ALTER TABLE scoring        DROP CONSTRAINT IF EXISTS scoring_id_cliente_fkey;
ALTER TABLE alertas        DROP CONSTRAINT IF EXISTS alertas_id_cliente_fkey;
ALTER TABLE recordatorios  DROP CONSTRAINT IF EXISTS recordatorios_id_cliente_fkey;

-- 2. Eliminar la PK actual de clientes
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_pkey;

-- 3. Cambiar el tipo de id_cliente a VARCHAR(50)
ALTER TABLE clientes ALTER COLUMN id_cliente TYPE VARCHAR(50);

-- 4. Recrear la PK con el nuevo tipo
ALTER TABLE clientes ADD PRIMARY KEY (id_cliente);

-- 5. Cambiar el tipo en las tablas relacionadas
ALTER TABLE creditos       ALTER COLUMN id_cliente TYPE VARCHAR(50);
ALTER TABLE abonos         ALTER COLUMN id_cliente TYPE VARCHAR(50);
ALTER TABLE scoring        ALTER COLUMN id_cliente TYPE VARCHAR(50);
ALTER TABLE alertas        ALTER COLUMN id_cliente TYPE VARCHAR(50);
ALTER TABLE tendero_cliente ALTER COLUMN id_cliente TYPE VARCHAR(50);
ALTER TABLE recordatorios  ALTER COLUMN id_cliente TYPE VARCHAR(50);

-- 6. Recrear las llaves foraneas
ALTER TABLE tendero_cliente ADD CONSTRAINT tendero_cliente_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);
ALTER TABLE creditos       ADD CONSTRAINT creditos_id_cliente_fkey       FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);
ALTER TABLE abonos         ADD CONSTRAINT abonos_id_cliente_fkey         FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);
ALTER TABLE scoring        ADD CONSTRAINT scoring_id_cliente_fkey        FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);
ALTER TABLE alertas        ADD CONSTRAINT alertas_id_cliente_fkey        FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);
ALTER TABLE recordatorios  ADD CONSTRAINT recordatorios_id_cliente_fkey  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);

COMMIT;
