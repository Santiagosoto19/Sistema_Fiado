# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FiadoCheck is a credit management system for neighborhood stores ("tenderos") to track informal credit ("fiado"). It consists of:

- `backend/` — Express.js REST API with PostgreSQL.
- `mobile/` — Expo / React Native app using file-based routing.
- `n8n/` — Reserved for future automation integrations (currently empty).

## Common Commands

### Backend

```bash
cd backend
npm install
npm run dev        # Start with nodemon (port 3000)
npm start          # Start with node (production)
node scripts/seed_database.js   # Seed test data
```

### Mobile

```bash
cd mobile
npm install
npm run start      # Start Expo dev server
npm run android    # Start + open Android
npm run ios        # Start + open iOS
npm run web        # Start + open web
npm run lint       # Run ESLint via expo lint
```

> No test suite is configured yet in either workspace.

## High-Level Architecture

### Backend (`backend/src/`)

- **Entry point**: `src/index.js` sets up Express, CORS, JSON parsing, health check (`GET /health`), and mounts all routes under `/api/`.
- **Database**: `src/config/database.js` exports a `pg.Pool`. It is currently configured for **NeonDB** (cloud PostgreSQL) with `ssl.rejectUnauthorized: false`.
- **Auth middleware** (`src/middleware/auth.js`): Extracts `Bearer` token, verifies JWT with `JWT_SECRET`, then validates the SHA256 hash of the token against the `sesiones` table (must be active and not expired). Injects `req.user` with `{ id_usuario, email, id_rol, id_tendero }`.
- **Data isolation**: Tenderos only see resources linked to them via the `tendero_cliente` junction table. Endpoints receiving `clienteId` or `creditoId` verify ownership before responding.
- **Session revocation**: On logout, the token hash is kept in `sesiones` with `estado = 'revocado'`, enabling immediate invalidation.

### Mobile (`mobile/`)

- **Routing**: Uses `expo-router` file-based routing.
  - `(auth)/` — Public screens (login, client registration).
  - `(tabs)/` — Protected screens with bottom-tab navigation.
- **Role-based entry** (`app/index.tsx`): Reads `token` from `AsyncStorage`.
  - No token → `/login`.
  - Token without `tendero` → `/(tabs)/vistaUsuario` (client role).
  - Token with `tendero` → `/(tabs)/dashboard` (store owner role).
- **Tab visibility** (`app/(tabs)/_layout.tsx`): Tabs are rendered conditionally based on role:
  - Tendero: dashboard, clientes, profile, logout.
  - Cliente: vistaUsuario, wallet, profile, logout.
- **Session security** (`hooks/useSessionTimeout.ts`):
  - **Cold start**: If the app opens with a stored token, it is invalidated immediately (forces re-login).
  - **Background**: After 1 minute in the background, the session is cleared on return to foreground.
  - Keys removed: `token`, `usuario`, `tendero`, `lastActive`.

### Domain Logic

- **Scoring** (`src/routes/scoring.js`): 4 variables, 25 points each (puntualidad, cumplimiento, historial, antigüedad). Risk levels: `bajo` (≥80), `medio` (50–79), `alto` (<50). Recommendation thresholds aligned: `bajo` → `aprobar`, `medio` → `con_precaucion`, `alto` → `rechazar`. Cliente nuevo sin historial: puntaje=50, nivel=`medio`, límite=$50.000.
- **Credits & Payments** (`src/routes/creditos.js`, `src/routes/abonos.js`): Creating an abono runs in a transaction: inserts the payment, updates `creditos.saldo_pendiente`, and marks the credit `pagado` if balance reaches zero.
- **Alerts** (`src/routes/alertas.js`): Types are `critica`, `proxima`, `informativa`. Returned sorted by priority.

### Database Model (PostgreSQL)

```
roles → usuario → sesiones
                → tenderos → tendero_cliente ↔ clientes
                                ↘ creditos → abonos
                                ↘ scoring
                                ↘ metricas_cartera
                                ↘ alertas
                                ↘ recordatorios
```

## Important Configuration

- **Backend `.env`** expects `DATABASE_URL` (NeonDB) and `JWT_SECRET`. `PORT` defaults to `3000`.
- **Mobile `config/config.ts`** hardcodes `API_URL: 'http://10.8.0.189:3000/api'` for local development. Update this IP when the backend host changes.
- **CORS**: Enabled globally (`app.use(cors())`) in the backend. Restrict in production.

## File Conventions

- Backend routes live in `backend/src/routes/` and are imported in `backend/src/index.js`.
- Mobile screens live in `mobile/app/(auth)/` or `mobile/app/(tabs)/`.
- Mobile business logic lives in `mobile/hooks/` (e.g., `useDashboard.ts`, `useClients.ts`).
- Mobile styles are co-located in `mobile/constants/` per screen (e.g., `dashboard.styles.ts`).
- Colors are centralized in `mobile/constants/colors.ts` and `mobile/constants/theme.ts`.
  
  

## Contexto del proyecto

FiadoCheck es un sistema de gestión de cartera de créditos para tenderos
de barrio. Stack: Node.js + Express (backend), Expo + React Native (mobile),
PostgreSQL en NeonDB, n8n reservado para automatizaciones futuras.

---

## Motor de analítica predictiva — Random Forest

### Objetivo

Clasificar clientes por perfil crediticio y apoyar la decisión del tendero
al momento de otorgar un crédito nuevo. El resultado se muestra como una
caja "Recomendación IA" en la pantalla de nuevo crédito.

### Arquitectura

- El scoring por reglas existe en `src/routes/scoring.js` (4 variables, 25 pts cada una).
- El Random Forest es un microservicio Python separado (`backend/ml_service/`) que consume los mismos features desde la tabla `scoring`.
- Node.js llama al microservicio desde `GET /api/scoring/:clienteId/recomendacion`.
- El endpoint `/recomendacion` combina scoring por reglas + predicción RF y retorna ambos al frontend.

### Microservicio Python (`backend/ml_service/`)

| Archivo | Propósito |
|---------|-----------|
| `model.py` | Entrena Random Forest con `scoring` existente y guarda `modelo.pkl` |
| `predict.py` | FastAPI en puerto `8000`: `POST /predict` para predicción, `POST /ml/retrain` para reentrenamiento |
| `features.py` | Extrae features y gestiona estado de entrenamiento (`ml_state.json`) |
| `requirements.txt` | Dependencias: fastapi, uvicorn, scikit-learn, psycopg2-binary, python-dotenv |
| `test_ml.py` | Script de prueba con urllib (sin curl) para verificar `/predict` y `/ml/retrain` |

### Comandos del microservicio

```bash
cd backend/ml_service

# Crear entorno virtual (recomendado)
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

# Instalar dependencias
pip install -r requirements.txt

# Entrenar modelo inicial
python model.py

# Iniciar servidor de predicciones
python predict.py
```

### Features del modelo

Las cinco variables vienen directamente de la tabla `scoring`:

- `pts_puntualidad` (0-25): proporción de créditos pagados a tiempo sobre créditos pagados
- `pts_cumplimiento` (0-25): días promedio de atraso en créditos pagados (0 días = 25 pts, ≤7 = 20, ≤15 = 15, ≤30 = 10, >30 = 0)
- `pts_historial` (0-25): proporción de créditos pagados completamente sobre créditos cerrados (pagado + vencido)
- `pts_antiguedad` (0-25): meses desde el registro del cliente
- `puntaje` (0-100): suma total (feature adicional)

### Niveles de riesgo y umbrales

| nivel_riesgo | puntaje | acción sugerida    |
| ------------ | ------- | ------------------ |
| bajo         | ≥80     | `aprobar`          |
| medio        | 50–79   | `con_precaucion`   |
| alto         | <50     | `rechazar`         |

**Límite sugerido:**
- base = promedio de los últimos 3 créditos cerrados
- factor: bajo=1.5 / medio=1.0 / alto=0.5
- límite_final = max(0, min(base × factor − saldo_pendiente_actual, 300.000))

**Cliente nuevo:**
- puntaje = 50, nivel = `medio`, recomendación = `con_precaucion`, límite = $50.000

### Reentrenamiento por eventos

El modelo se reentrena solo cuando ocurre un evento significativo, no por tiempo:

1. **Crédito pagado** — endpoint `POST /api/creditos/:creditoId/abonos` detecta cuando `nuevoEstado === 'pagado'` y dispara `POST /ml/retrain`.
2. **Mora >30 días** — endpoint `GET /api/creditos/:id` detecta cuando un crédito vencido supera 30 días y dispara retrain.
3. **Nuevo scoring creado** — endpoint `POST /api/scoring/:clienteId/calcular` dispara retrain cuando se crea un scoring nuevo.

El microservicio verifica que el volumen de datos creció >=20% antes de reentrenar. El reentrenamiento corre en background con **model swapping** (el modelo anterior sigue sirviendo mientras se entrena el nuevo).

### Integración Node.js

`backend/src/routes/scoring.js` incluye:
- Función `callMLService(clienteId)` que hace POST a `localhost:8000/predict`.
- El endpoint `GET /api/scoring/:clienteId/recomendacion` combina scoring por reglas + predicción RF en el campo `random_forest`.
- Si el microservicio ML no está corriendo, `random_forest` es `null` y el endpoint sigue funcionando.

`backend/src/utils/mlTrigger.js` exporta `triggerMLRetrain(evento)` para que cualquier ruta dispare el reentrenamiento de forma asíncrona y sin bloquear.

### Bootstrap del modelo

El campo `nivel_riesgo` calculado por reglas actúa como etiqueta de entrenamiento. Al correr `python model.py` se genera `modelo.pkl` y `ml_state.json`.

### Bug conocido en useVistaUsuario.ts (CORREGIDO)

~~nivelConfianza usa (scoring.puntaje / 1000) * 100~~ → Corregido a `(scoring.puntaje / 100) * 100` en `mobile/hooks/useVistaUsuario.ts`.

### Pantallas pendientes relacionadas

- "Nuevo crédito": placeholder en Dashboard (`handleNuevoCredito` vacío).
- Debe llamar `GET /api/scoring/:clienteId/recomendacion` al seleccionar cliente.
- Renderizar caja RecomendacionIA con: puntaje, nivel_riesgo, limite_sugerido.
