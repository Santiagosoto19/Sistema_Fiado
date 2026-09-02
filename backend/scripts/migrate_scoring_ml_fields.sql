-- Migración: añadir campos de predicción ML a la tabla scoring
-- Estos valores se registran automáticamente cada vez que se calcula el scoring.

ALTER TABLE scoring
    ADD COLUMN IF NOT EXISTS nivel_riesgo_rf VARCHAR(20),
    ADD COLUMN IF NOT EXISTS puntaje_rf INT,
    ADD COLUMN IF NOT EXISTS limite_sugerido_rf NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS confianza NUMERIC(5,4);
