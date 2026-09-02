-- Migracion: permite guardar el push token de Expo Notifications del dispositivo
-- del usuario, para poder enviarle notificaciones push (recordatorios de pago).

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS push_token TEXT;
