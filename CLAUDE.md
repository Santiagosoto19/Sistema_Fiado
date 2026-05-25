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

- **Scoring** (`src/routes/scoring.js`): 4 variables, 25 points each (puntualidad, historial, frecuencia, antigüedad). Risk levels: `bajo` (≥80), `medio` (50–79), `alto` (<50). Recommendation thresholds: `aprobar` (≥60), `con_precaucion` (40–59), `rechazar` (<40).
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

- El scoring por reglas ya existe y está completo en `src/routes/scoring.js`.
- El Random Forest es un microservicio Python separado (`backend/ml_service/`).
- Node.js llama al microservicio desde `GET /api/scoring/:clienteId/recomendacion`.
- El frontend consume ese endpoint antes de mostrar el formulario de nuevo crédito.

### Microservicio — archivos a crear

backend/ml_service/
├── model.py       # entrenamiento del RF con scikit-learn, guarda modelo.pkl
├── predict.py     # FastAPI: POST /predict → nivel_riesgo, puntaje_rf, limite_sugerido, confianza
├── features.py    # extrae pts_puntualidad, pts_historial, pts_frecuencia, pts_antiguedad, puntaje desde tabla scoring
└── modelo.pkl     # generado al correr model.py

### Features del modelo

Las cuatro variables vienen directamente de la tabla `scoring`:

- pts_puntualidad (0-25): penalización proporcional a % de créditos vencidos
- pts_historial  (0-25): según número de créditos totales
- pts_frecuencia (0-25): ratio total_abonado / total_fiado
- pts_antiguedad (0-25): meses desde primer crédito
- puntaje        (0-100): suma total (feature adicional)

### Niveles de riesgo y umbrales

| nivel_riesgo | puntaje RF | acción sugerida    |
| ------------ | ---------- | ------------------ |
| bajo         | 70–100     | Aprobar            |
| medio        | 40–69      | Aprobar con límite |
| alto         | 0–39       | No recomendado     |

###### Límite sugerido

- Bajo:  monto_ultimo_credito × 2.0
- Medio: monto_ultimo_credito × 1.5
- Alto:  monto_ultimo_credito × 0.8 

### Endpoint Node.js a modificar

GET /api/scoring/:clienteId/recomendacion
→ leer tabla scoring (ya implementado)
→ llamar POST http://localhost:8000/ml/predict con { id_cliente }
→ combinar respuesta de reglas + RF y retornar al frontend

### Bootstrap del modelo

El campo nivel_riesgo calculado por reglas actúa como etiqueta de entrenamiento.

### Bug conocido en useVistaUsuario.ts

nivelConfianza usa (scoring.puntaje / 1000) * 100 — incorrecto.
Corregir a: (scoring.puntaje / 100) * 100

### Pantallas pendientes relacionadas

- "Nuevo crédito": placeholder en Dashboard (handleNuevoCredito vacío)
- Debe llamar GET /api/scoring/:clienteId/recomendacion al seleccionar cliente
- Renderizar caja RecomendacionIA con: puntaje, nivel_riesgo, limite_sugerido
