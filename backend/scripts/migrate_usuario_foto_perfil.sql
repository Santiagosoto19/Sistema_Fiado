-- Migracion: permite guardar una imagen de perfil serializada como URL o data URI.

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS foto_perfil TEXT;

-- Si la columna ya existia como VARCHAR(255) (por ejemplo, creada manualmente
-- antes de esta migracion), hay que ampliarla a TEXT para poder guardar
-- imagenes en base64, que superan por mucho 255 caracteres.
ALTER TABLE usuario
    ALTER COLUMN foto_perfil TYPE TEXT;
