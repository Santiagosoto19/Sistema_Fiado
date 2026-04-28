# Sistema_Fiado

Sistema móvil en React Native para gestionar el crédito informal ("fiado") en tiendas de barrio. Incluye API REST con Node.js, control de cartera, scoring de riesgo crediticio, automatizaciones con n8n, alertas por WhatsApp/SMS vía Twilio y asistente IA. Base de datos PostgreSQL. Proyecto de grado.

## Estado del Proyecto

### Backend API ✅ Completado
API REST completa con Express.js, autenticación JWT, y todos los módulos implementados.

### App Móvil 📱 En desarrollo
Aplicación Expo/React Native - estructura base creada.

---

## Estructura del Proyecto

```
Sistema_Fiado/
├── backend/           # API REST con Express + PostgreSQL ✅
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   ├── config/database.js    # Conexión a PostgreSQL
│   │   ├── middleware/auth.js    # Autenticación JWT
│   │   └── routes/
│   │       ├── auth.js           # Login / Logout
│   │       ├── dashboard.js      # Resumen principal
│   │       ├── cartera.js        # Cartera y vencidos
│   │       ├── clientes.js       # CRUD clientes
│   │       ├── creditos.js       # Créditos y abonos
│   │       ├── abonos.js         # Detalle de abonos
│   │       ├── scoring.js        # Scoring crediticio IA
│   │       ├── alertas.js        # Sistema de alertas
│   │       ├── analitica.js      # KPIs y predicciones
│   │       └── reportes.js       # Generación de reportes
│   ├── README.md                 # Documentación completa
│   └── package.json
│
├── mobile/            # App móvil (Expo/React Native) - en desarrollo
│
└── web/               # Frontend web (próximamente)
```

---

## Módulos Implementados

### ✅ Gestión de Clientes
- Registrar, actualizar y listar clientes
- Búsqueda por nombre o ID
- Historial crediticio completo
- Estados: activo, mora, al día, sin deuda

### ✅ Créditos y Pagos
- Registrar fiados con fecha límite
- Control de abonos parciales o totales
- Actualización automática de saldos
- Detección automática de mora

### ✅ Scoring Crediticio (IA)
- Algoritmo de 4 variables (100 pts máximo)
- Puntualidad, historial, frecuencia, antigüedad
- Recomendaciones: aprobar / con precaución / rechazar
- Límites sugeridos por cliente

### ✅ Analítica y Predicciones
- Indicadores KPI por período (semana/mes/trimestre)
- Clasificación de cartera vigente/vencida
- Predicción de flujo de caja a 7 días
- Reportes exportables en HTML

### ✅ Sistema de Alertas
- Alertas críticas, próximas e informativas
- Clasificación por rango de mora (1-7, 8-15, +15 días)
- Marcado de alertas como leídas

---

## Tecnologías

### Backend
| Componente | Tecnología |
|------------|------------|
| Runtime | Node.js 18+ |
| Framework | Express 5.x |
| Base de datos | PostgreSQL 14+ |
| Autenticación | JWT + sesiones con hash SHA256 |
| ORM/Cliente | pg (node-postgres) |
| Hash passwords | bcryptjs |
| Variables entorno | dotenv |

### Frontend (próximamente)
| Componente | Tecnología |
|-----------|------------|
| App móvil | React Native / Expo |
| Frontend web | React |

---

## Primeros Pasos

### 1. Backend

```bash
cd backend
npm install
```

Crear archivo `.env` con la configuración de PostgreSQL:

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fiadocheck
DB_SSL=false
JWT_SECRET=tu_secret_jwt_seguro
JWT_EXPIRES_IN=24h
```

Iniciar el servidor:

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

> **Nota:** Requiere que la base de datos PostgreSQL esté corriendo y las tablas estén creadas con el script SQL del modelo de datos.

---

## API Endpoints Resumidos

| Categoría | Endpoints |
|-----------|-----------|
| Auth | POST login, POST logout |
| Dashboard | GET dashboard |
| Cartera | GET cartera, GET cartera/cliente/:id, GET cartera/vencidos |
| Clientes | GET listar, GET/:id, POST crear, PUT/:id, GET/:id/historial, GET/:id/pagos |
| Créditos | GET listar, GET/:id, POST crear, PATCH/:id, GET cliente/:id, POST/:id/abonos, GET/:id/abonos |
| Scoring | GET/:id, POST/:id/calcular, GET/:id/recomendacion |
| Alertas | GET listar, PATCH/:id/leer |
| Analítica | GET indicadores, GET pagos-diarios, GET prediccion-flujo |
| Reportes | GET generar, GET export/pdf |

Ver [backend/README.md](backend/README.md) para documentación completa.

---

## Modelo de Datos

El sistema utiliza PostgreSQL con las siguientes tablas principales:

```
roles → usuario → sesiones (JWT tokens)
                → tenderos → tendero_cliente ↔ clientes
                                    ↘ creditos → abonos
                                    ↘ scoring
                                    ↘ metricas_cartera
                                    ↘ alertas
                                    ↘ recordatorios
```

---

## Próximos Pasos

- [ ] Completar la base de datos en PostgreSQL
- [ ] Crear script de seed con datos de prueba
- [ ] Implementar autenticación de 2 factores
- [ ] Crear endpoints para webhooks de n8n
- [ ] Agregar paginación a listados
- [ ] Implementar tests unitarios con Jest
- [ ] Desarrollar la app móvil
- [ ] Integrar notificaciones WhatsApp/SMS con Twilio

---

## Licencia

ISC