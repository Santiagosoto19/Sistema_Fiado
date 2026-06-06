-- Crear tabla de historial de predicciones del modelo ML
-- Cada llamada a POST /predict genera un registro vinculado al scoring vigente del cliente.

CREATE TABLE IF NOT EXISTS predicciones_ml (
    id_prediccion SERIAL PRIMARY KEY,
    id_scoring INT NOT NULL,
    id_cliente VARCHAR(50) NOT NULL,
    nivel_riesgo_rf VARCHAR(20),
    puntaje_rf INT,
    limite_sugerido NUMERIC(12,2),
    confianza NUMERIC(5,4),        -- probabilidad máxima de la clase predicha (0.0000 - 1.0000)
    fecha_prediccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_predicciones_cliente ON predicciones_ml(id_cliente);
CREATE INDEX IF NOT EXISTS idx_predicciones_scoring ON predicciones_ml(id_scoring);
CREATE INDEX IF NOT EXISTS idx_predicciones_fecha ON predicciones_ml(fecha_prediccion);
