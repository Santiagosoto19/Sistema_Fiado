-- Migración: renombrar pts_frecuencia a pts_cumplimiento
-- Ejecutar en PostgreSQL (NeonDB)

ALTER TABLE scoring RENAME COLUMN pts_frecuencia TO pts_cumplimiento;
