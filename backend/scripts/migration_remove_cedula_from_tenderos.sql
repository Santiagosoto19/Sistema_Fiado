-- Migration: Remove cedula column from tenderos table
-- The cedula value will now be stored as id_tendero

ALTER TABLE tenderos
DROP COLUMN IF EXISTS cedula;
