# FiadoCheck — Documentación Técnica Completa

> Fecha de generación: 2026-05-17
> Rama actual: `develop`

---

## 1. Resumen del Proyecto

**FiadoCheck** es un sistema de gestión de cartera de créditos orientado a tenderos (comerciantes de barrio) que permite administrar clientes, créditos (fiados), pagos/abonos, scoring crediticio, alertas y análisis predictivo. El sistema contempla dos roles principales de usuario: **tendero** y **cliente**, cada uno con vistas y permisos diferenciados.

El proyecto está compuesto por:

- **`backend/`**: API REST en Node.js + Express con PostgreSQL.
- **`mobile/`**: Aplicación móvil multiplataforma desarrollada con Expo + React Native.
- **`n8n/`**: Carpeta reservada para futuras integraciones con n8n (actualmente vacía).

---

## 2. Arquitectura General

```
Sistema_Fiado/
├── backend/                  # API REST
│   ├── src/
│   │   ├── index.js              # Entry point y registro de rutas
│   │   ├── config/
│   │   │   └── database.js       # Pool de conexión PostgreSQL
│   │   ├── middleware/
│   │   │   └── auth.js           # Validación JWT y control de sesiones
│   │   ├── routes/               # Endpoints agrupados por dominio
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── cartera.js
│   │   │   ├── clientes.js
│   │   │   ├── creditos.js
│   │   │   ├── abonos.js
│   │   │   ├── alertas.js
│   │   │   ├── scoring.js
│   │   │   ├── analitica.js
│   │   │   └── reportes.js
│   │   ├── jobs/.gitkeep
│   │   ├── middlewares/.gitkeep
│   │   ├── modules/.gitkeep
│   │   └── utils/.gitkeep
│   ├── scripts/
│   │   ├── seed_database.js      # Poblado inicial de la base de datos
│   │   └── fixPassword.js
│   ├── .env
│   └── package.json
│
├── mobile/                   # App Expo / React Native
│   ├── app/                      # File-based routing (expo-router)
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── registerClientes.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── clientes.tsx
│   │   │   ├── vistaUsuario.tsx
│   │   │   ├── wallet.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── transfer.tsx
│   │   │   └── logout.tsx
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── modal.tsx
│   ├── components/
│   ├── config/
│   │   └── config.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── theme.ts
│   │   ├── login.styles.ts
│   │   ├── dashboard.styles.ts
│   │   ├── vistaUsuario.styles.ts
│   │   ├── Clients.styles.ts
│   │   └── registerClientes.styles.ts
│   ├── hooks/
│   │   ├── useLogin.ts
│   │   ├── useDashboard.ts
│   │   ├── useClients.ts
│   │   ├── useVistaUsuario.ts
│   │   ├── useRegisterClientes.ts
│   │   ├── useSessionTimeout.ts
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts
│   │   └── use-theme-color.ts
│   ├── assets/
│   └── package.json
│
└── n8n/                      # Integraciones futuras (vacío)
    └── README.md
```

---

## 3. Backend

### 3.1 Tecnologías y Dependencias Principales

| Paquete        | Versión | Propósito                        |
| -------------- | ------- | -------------------------------- |
| `express`      | ^5.2.1  | Framework web                    |
| `pg`           | ^8.20.0 | Cliente PostgreSQL               |
| `bcryptjs`     | ^3.0.3  | Hash de contraseñas              |
| `jsonwebtoken` | ^9.0.3  | Generación y validación de JWT   |
| `cors`         | ^2.8.6  | Habilitación de CORS             |
| `dotenv`       | ^17.4.2 | Variables de entorno             |
| `uuid`         | ^14.0.0 | Generación de UUIDs              |
| `nodemon`      | ^3.1.14 | Recarga automática en desarrollo |

### 3.2 Variables de Entorno (`backend/.env`)

```env
PORT=3000
DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>?sslmode=require
DB_SSL=true
JWT_SECRET=fiadocheck_jwt_secret_2024_secure
JWT_EXPIRES_IN=24h
```

### 3.3 Modelo de Base de Datos

El sistema utiliza PostgreSQL con las siguientes tablas:

| Tabla              | Descripción                                      |
| ------------------ | ------------------------------------------------ |
| `roles`            | Roles de usuario (tendero, cliente, admin)       |
| `usuario`          | Credenciales de autenticación                    |
| `sesiones`         | Tokens activos e invalidados (revocados)         |
| `tenderos`         | Perfil del tendero (nombre, tienda, contacto)    |
| `clientes`         | Perfil del cliente (nombre, teléfono, dirección) |
| `tendero_cliente`  | Relación many-to-many entre tenderos y clientes  |
| `creditos`         | Créditos registrados con saldo y estado          |
| `abonos`           | Pagos/abonos realizados a créditos               |
| `scoring`          | Puntajes crediticios calculados por cliente      |
| `metricas_cartera` | Métricas diarias de cartera                      |
| `alertas`          | Alertas generadas automáticamente                |
| `recordatorios`    | Recordatorios programados                        |

**Relaciones principales:**

```
usuario 1──N sesiones
usuario 1──1 tenderos
usuario 1──1 clientes

tenderos 1──N tendero_cliente N──1 clientes
tenderos 1──N creditos N──1 clientes
tenderos 1──N metricas_cartera
tenderos 1──N alertas N──1 clientes, creditos

creditos 1──N abonos
clientes 1──1 scoring
```

### 3.4 Entry Point (`src/index.js`)

- Configura Express con `cors()` y `express.json()`.
- Expone un endpoint de health check en `GET /health`.
- Registra todas las rutas bajo el prefijo `/api/`.
- Expone un webhook de prueba en `POST /webhooks/test`.
- Implementa manejo de errores global (`404` y `500`).
- El servidor escucha en el puerto definido por `PORT` (default `3000`).

### 3.5 Conexión a Base de Datos (`src/config/database.js`)

Utiliza `pg.Pool` con `DATABASE_URL`. La conexión actual está configurada para NeonDB (PostgreSQL cloud) con `ssl.rejectUnauthorized: false`.

### 3.6 Middleware de Autenticación (`src/middleware/auth.js`)

- Extrae el token del header `Authorization: Bearer <token>`.
- Verifica la firma JWT con `JWT_SECRET`.
- Calcula el hash SHA256 del token y lo valida contra la tabla `sesiones` (debe estar activo y no expirado).
- Inyecta en `req.user` el payload decodificado (`id_usuario`, `email`, `id_rol`, `id_tendero`).
- Maneja errores específicos: token expirado, token inválido, sesión revocada.

### 3.7 Módulos y Endpoints

#### 3.7.1 Autenticación (`src/routes/auth.js`)

| Método | Ruta                         | Descripción                                                          | Auth |
| ------ | ---------------------------- | -------------------------------------------------------------------- | ---- |
| POST   | `/api/auth/login`            | Login por email/password. Devuelve JWT + datos del usuario + tendero | No   |
| POST   | `/api/auth/logout`           | Invalida la sesión activa (revoca token en BD)                       | Sí   |
| POST   | `/api/auth/registerClientes` | Registro de un nuevo cliente (crea `usuario` + `clientes`)           | No   |

**Flujo de login:**

1. Valida email y password.
2. Busca el usuario en `usuario`.
3. Verifica que el estado sea `activo`.
4. Compara el hash con `bcrypt.compare`.
5. Obtiene el tendero asociado (`tenderos.id_usuario`).
6. Genera JWT con `jwt.sign` (expira en 24h).
7. Guarda el hash SHA256 del token en `sesiones` con fecha de expiración.
8. Retorna `token`, `usuario` y `tendero`.

**Flujo de registro de clientes:**

1. Valida campos obligatorios.
2. Verifica que el email no exista.
3. Hashea la contraseña con `bcrypt.genSalt(10)`.
4. Inserta en `usuario` con `id_rol` default `2` (cliente).
5. Inserta en `clientes` vinculado al `id_usuario`.
6. Ejecuta en transacción (`BEGIN` / `COMMIT` / `ROLLBACK`).

#### 3.7.2 Dashboard (`src/routes/dashboard.js`)

| Método | Ruta             | Descripción                                                    | Auth |
| ------ | ---------------- | -------------------------------------------------------------- | ---- |
| GET    | `/api/dashboard` | Resumen de cartera total, mora, clientes y últimos movimientos | Sí   |

**Indicadores retornados:**

- `cartera_total`: Suma de `monto_total` de créditos no pagados.
- `monto_en_mora`: Suma de saldos pendientes con estado `vencido`.
- `monto_al_dia`: Suma de saldos pendientes con estado `vigente`.
- `total_clientes`: Cantidad de clientes activos del tendero.
- `clientes_en_mora`: Clientes con al menos un crédito vencido.
- `clientes_sin_deuda`: Clientes sin saldo pendiente.
- `ultimos_movimientos`: Últimos 3 abonos con datos del cliente y crédito.

#### 3.7.3 Cartera (`src/routes/cartera.js`)

| Método | Ruta                              | Descripción                                 | Auth |
| ------ | --------------------------------- | ------------------------------------------- | ---- |
| GET    | `/api/cartera`                    | Totales de créditos vigentes vs vencidos    | Sí   |
| GET    | `/api/cartera/cliente/:clienteId` | Desglose de cartera por cliente             | Sí   |
| GET    | `/api/cartera/vencidos`           | Clasificación de vencidos por rango de días | Sí   |

**Clasificación de vencidos:**

- `1_7_dias`: Créditos vencidos de 1 a 7 días.
- `8_15_dias`: Créditos vencidos de 8 a 15 días.
- `mas_15_dias`: Créditos vencidos con más de 15 días.

#### 3.7.4 Clientes (`src/routes/clientes.js`)

| Método | Ruta                          | Descripción                                          | Auth |
| ------ | ----------------------------- | ---------------------------------------------------- | ---- |
| GET    | `/api/clientes`               | Lista con filtros (`estado`, `q`) y totales de deuda | Sí   |
| GET    | `/api/clientes/me`            | Datos del cliente logueado (rol cliente)             | Sí   |
| GET    | `/api/clientes/:id`           | Detalle completo con scoring y totales               | Sí   |
| POST   | `/api/clientes`               | Crear cliente y relación tendero-cliente             | Sí   |
| PUT    | `/api/clientes/:id`           | Actualizar información básica                        | Sí   |
| GET    | `/api/clientes/:id/historial` | Historial crediticio completo (créditos + abonos)    | Sí   |
| GET    | `/api/clientes/:id/pagos`     | Historial de abonos del cliente                      | Sí   |

**Filtros de estado:**

- `estado=mora`: Clientes con créditos vencidos.
- `estado=al_dia`: Clientes con créditos vigentes pero sin vencidos.
- `estado=sin_deuda`: Clientes sin saldo pendiente.
- `q=nombre`: Búsqueda por nombre o identificación (case-insensitive).

**Nota sobre `/me`:**
Permite que un usuario con rol cliente consulte su propio perfil, incluyendo datos de la tienda asociada, scoring y totales de deuda. Es la base de la vista `vistaUsuario` en la app móvil.

#### 3.7.5 Créditos (`src/routes/creditos.js`)

| Método | Ruta                               | Descripción                                         | Auth |
| ------ | ---------------------------------- | --------------------------------------------------- | ---- |
| GET    | `/api/creditos`                    | Listar créditos con filtros (`clienteId`, `estado`) | Sí   |
| GET    | `/api/creditos/:id`                | Detalle completo con días de atraso y abonos        | Sí   |
| POST   | `/api/creditos`                    | Registrar nuevo crédito                             | Sí   |
| PATCH  | `/api/creditos/:id`                | Actualizar estado (`vigente`, `pagado`, `vencido`)  | Sí   |
| GET    | `/api/creditos/cliente/:clienteId` | Créditos activos de un cliente                      | Sí   |

**Cálculo de días de atraso:**
Si el crédito está en estado `vencido`, se calcula la diferencia en días entre `fecha_limite_pago` y la fecha actual.

**Registro de crédito:**
Al crear un crédito, el `saldo_pendiente` se inicializa igual al `monto_total` y el estado es `vigente`. Se verifica que el cliente pertenezca al tendero mediante `tendero_cliente`.

#### 3.7.6 Abonos (`src/routes/abonos.js`)

| Método | Ruta              | Descripción                    | Auth |
| ------ | ----------------- | ------------------------------ | ---- |
| GET    | `/api/abonos/:id` | Detalle de un abono específico | Sí   |

**Los abonos se registran a través del endpoint de créditos:**

| Método | Ruta                              | Descripción                                        | Auth |
| ------ | --------------------------------- | -------------------------------------------------- | ---- |
| POST   | `/api/creditos/:creditoId/abonos` | Registrar abono y actualizar saldo automáticamente | Sí   |
| GET    | `/api/creditos/:creditoId/abonos` | Listar abonos de un crédito                        | Sí   |

**Comportamiento automático al registrar un abono:**

1. Se valida que el crédito exista y pertenezca al tendero.
2. Se calcula `nuevoSaldo = saldo_pendiente - monto`.
3. Se ejecuta en transacción:
   - Inserta el abono en la tabla `abonos`.
   - Actualiza `creditos.saldo_pendiente`.
   - Si `nuevoSaldo <= 0`, cambia el estado del crédito a `pagado`.

#### 3.7.7 Scoring Crediticio (`src/routes/scoring.js`)

| Método | Ruta                                    | Descripción                             | Auth |
| ------ | --------------------------------------- | --------------------------------------- | ---- |
| GET    | `/api/scoring/:clienteId`               | Ver scoring actual con desglose         | Sí   |
| POST   | `/api/scoring/:clienteId/calcular`      | Recalcular scoring en base al historial | Sí   |
| GET    | `/api/scoring/:clienteId/recomendacion` | Recomendación de otorgamiento           | Sí   |

**Variables de scoring (25 pts cada una, total 100):**

| Variable        | Lógica                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **Puntualidad** | Sin créditos vencidos = 25 pts. Penalización proporcional al % de créditos vencidos.                 |
| **Historial**   | >=10 créditos = 25 pts; >=5 = 20 pts; >=3 = 15 pts; >=1 = 10 pts.                                    |
| **Frecuencia**  | Ratio `total_abonado / total_fiado`: >=95% = 25 pts; >=80% = 20 pts; >=50% = 15 pts; >=25% = 10 pts. |
| **Antigüedad**  | Meses como cliente: >=24 = 25 pts; >=12 = 20 pts; >=6 = 15 pts; >=3 = 10 pts; >=1 = 5 pts.           |

**Niveles de riesgo:**

- `bajo` (>=80 pts): Cliente excelente.
- `medio` (50-79 pts): Cliente aceptable.
- `alto` (<50 pts): Cliente de alto riesgo.

**Límite sugerido:**
Basado en el último crédito del cliente y multiplicado por un factor según el nivel de riesgo:

- Bajo: `monto_ultimo * 1.5`
- Medio: `monto_ultimo * 1.2`
- Alto: `monto_ultimo * 0.8` 

**Recomendación:**

- `aprobar`: Puntaje >= 60.
- `con_precaucion`: Puntaje 40-59.
- `rechazar`: Puntaje < 40.

#### 3.7.8 Alertas (`src/routes/alertas.js`)

| Método | Ruta                    | Descripción                                   | Auth |
| ------ | ----------------------- | --------------------------------------------- | ---- |
| GET    | `/api/alertas`          | Listar alertas no leídas con filtros por tipo | Sí   |
| PATCH  | `/api/alertas/:id/leer` | Marcar alerta como leída                      | Sí   |

**Tipos de alerta:**

- `critica`: Cliente con mora severa.
- `proxima`: Pago próximo a vencer.
- `informativa`: Recordatorios y notificaciones generales.

El orden de prioridad en la respuesta es: críticas primero, luego próximas, luego informativas.

#### 3.7.9 Analítica (`src/routes/analitica.js`)

| Método | Ruta                              | Descripción                                     | Auth |
| ------ | --------------------------------- | ----------------------------------------------- | ---- |
| GET    | `/api/analitica/indicadores`      | KPIs del período (`semana`, `mes`, `trimestre`) | Sí   |
| GET    | `/api/analitica/pagos-diarios`    | Pagos agrupados por día del mes actual          | Sí   |
| GET    | `/api/analitica/prediccion-flujo` | Predicción de flujo de caja a 7 días            | Sí   |

**Indicadores calculados:**

- `monto_fiado`: Total fiado en el período.
- `porcentaje_cartera_vencida`: Saldo vencido / saldo total pendiente.
- `dias_promedio_atraso`: Promedio de días de atraso en créditos vencidos.
- `tasa_recuperacion`: Total pagado / total fiado en el período.

**Predicción de flujo:**
Recorre los créditos `vigente` cuya `fecha_limite_pago` cae dentro de los próximos 7 días. Calcula el `monto_esperado` por día y devuelve un nivel de confianza del 70%-85%.

#### 3.7.10 Reportes (`src/routes/reportes.js`)

| Método | Ruta                       | Descripción                                                    | Auth |
| ------ | -------------------------- | -------------------------------------------------------------- | ---- |
| GET    | `/api/reportes`            | Reporte ejecutivo de cartera con top deudores                  | Sí   |
| GET    | `/api/reportes/export/pdf` | Exportación en HTML formateado (listo para imprimir/convertir) | Sí   |

**El reporte incluye:**

- Resumen de créditos por estado (cantidad, monto total, saldo pendiente).
- Total de pagos recibidos en el período.
- Monto en mora.
- Tasa de recuperación.
- Top 3 deudores (nombre y monto total adeudado).

**Exportación:**
Genera un documento HTML completo con estilos CSS inline. Se devuelve como `text/html` con header `Content-Disposition: attachment` para facilitar la descarga.

---

## 4. Frontend Mobile

### 4.1 Tecnologías y Dependencias Principales

| Paquete                                     | Versión  | Propósito                                     |
| ------------------------------------------- | -------- | --------------------------------------------- |
| `expo`                                      | ~54.0.33 | Framework y runtime                           |
| `expo-router`                               | ~6.0.23  | File-based routing                            |
| `react-native`                              | 0.81.5   | Framework de UI nativa                        |
| `react`                                     | 19.1.0   | Librería de UI                                |
| `axios`                                     | ^1.15.2  | Cliente HTTP (instalado, disponible para uso) |
| `@react-navigation/*`                       | ^7.x     | Navegación por tabs                           |
| `@react-native-async-storage/async-storage` | 2.2.0    | Almacenamiento local persistente              |
| `lucide-react-native`                       | ^1.14.0  | Iconos vectoriales                            |
| `@expo-google-fonts/poppins`                | ^0.4.1   | Tipografía Poppins                            |
| `expo-haptics`                              | ~15.0.8  | Feedback háptico en tabs                      |
| `expo-image`                                | ~3.0.11  | Renderizado optimizado de imágenes            |
| `expo-splash-screen`                        | ~31.0.13 | Pantalla de carga inicial                     |
| `react-native-reanimated`                   | ~4.1.1   | Animaciones nativas                           |
| `react-native-gesture-handler`              | ~2.28.0  | Manejo de gestos                              |

### 4.2 Configuración de Red (`mobile/config/config.ts`)

```ts
export const CONFIG = {
  API_URL: 'http://10.8.0.189:3000/api',
};
```

> Nota: La IP apunta al servidor backend en desarrollo local. Debe actualizarse según el entorno de despliegue.

### 4.3 Navegación y Routing

La app utiliza **file-based routing** de `expo-router`.

**Grupos de rutas:**

- `(auth)`: Pantallas públicas (login, registro de clientes).
- `(tabs)`: Pantallas protegidas con navegación inferior.

**Flujo de redirección (`app/index.tsx`):**

1. Al iniciar la app, verifica si existe `token` en `AsyncStorage`.
2. Si no hay token -> redirige a `/login`.
3. Si hay token pero no hay `tendero` -> redirige a `/(tabs)/vistaUsuario` (rol cliente).
4. Si hay token y `tendero` -> redirige a `/(tabs)/dashboard` (rol tendero).

**Protección de rutas (`app/_layout.tsx`):**

- Implementa un `useEffect` que escucha cambios de navegación.
- Si el usuario no tiene token y está en una ruta protegida (`(tabs)` o `vistaUsuario`), lo redirige a `/login`.
- Si el usuario tiene token y está en `(auth)`, lo redirige según su rol (tendero -> dashboard, cliente -> vistaUsuario).
- Usa la fuente Poppins cargada vía `expo-font`.

**Navegación por Tabs (`app/(tabs)/_layout.tsx`):**

- Renderiza tabs condicionalmente según el rol detectado en `AsyncStorage`:
  - **Tendero**: `dashboard`, `clientes`, `profile`, `logout`.
  - **Cliente**: `vistaUsuario`, `wallet`, `profile`, `logout`.
- Los tabs ocultos (`transfer`) se configuran con `href: null`.
- Usa `HapticTab` para feedback táctil al presionar.

### 4.4 Pantallas y Componentes

#### 4.4.1 Login (`app/(auth)/login.tsx`)

- Pantalla de bienvenida con diseño de dos secciones: header verde y card blanca inferior.
- Campos: Email, Contraseña (con toggle de visibilidad usando iconos `Eye` / `EyeOff` de Lucide).
- Botones: Entrar, Olvidaste contraseña, Registrarse, Login con Google (placeholders).
- Integrado con el hook `useLogin`.

#### 4.4.2 Dashboard (`app/(tabs)/dashboard.tsx`)

**Vista exclusiva para tenderos.**

Muestra:

- Header con saludo personalizado (`Hola, {nombre}`) y nombre de la tienda.
- **Total por Cobrar**: Tarjeta principal con el monto total de cartera.
- **Stats**: Dos tarjetas secundarias con `En mora` (rojo) y `Al día` (verde), incluyendo conteo de clientes.
- **Actividad Reciente**: Lista de últimos movimientos con avatar circular, nombre, subtítulo y monto.
- **Barra de búsqueda animada**: Se expande/contrae con `Animated.Value` y filtra movimientos por nombre de cliente.
- **Filtros de fecha**: `Siempre`, `Hoy`, `Esta semana`, `Este mes`.
- Botones de acción: `+ Nuevo Crédito` y `Registrar Pago` (placeholders para futuras navegaciones).

#### 4.4.3 Clientes (`app/(tabs)/clientes.tsx`)

**Vista exclusiva para tenderos.**

Muestra:

- Header con título "Clientes" y contador de clientes registrados.
- Buscador por nombre con icono de lupa.
- Filtros rápidos: `Todos`, `En Mora`, `Al Día`, `Sin Deuda`.
- Lista de clientes (`FlatList`) con tarjetas que incluyen:
  - Avatar circular con iniciales y color de fondo generado por `id_cliente`.
  - Nombre completo.
  - Subtítulo con deuda o estado.
  - Badge de estado (`Al Día`, `Mora`, `Próximo`, `Sin Deuda`).
  - Monto total adeudado.
- Botón flotante inferior: `+ Registrar Nuevo Cliente`.

#### 4.4.4 Vista Usuario (`app/(tabs)/vistaUsuario.tsx`)

**Vista exclusiva para clientes.**

Muestra:

- Header verde con saludo personalizado y nombre de la tienda asociada.
- **Tarjeta de deuda**: Total a pagar y "Sujeto a condiciones de crédito".
- **Nivel de confianza**: Barra de progreso calculada a partir del `scoring.puntaje` del backend (máximo 100%). Muestra etiqueta motivacional.
- **Últimos movimientos**: Lista combinada de cargos (créditos) y abonos, ordenados cronológicamente descendente. Los cargos se muestran en rojo y los abonos en verde.
- Botón `Contactar a la Tienda`: Abre WhatsApp con el número de teléfono de la tienda usando `Linking.openURL`.

#### 4.4.5 Perfil (`app/(tabs)/profile.tsx`)

Pantalla común para ambos roles.

- Muestra icono de perfil grande y nombre genérico.
- Botón de cierre de sesión con confirmación vía `Alert.alert`.
- Al cerrar sesión, limpia `AsyncStorage` y redirige a `/login`.

#### 4.4.6 Logout (`app/(tabs)/logout.tsx`)

Pantalla técnica que ejecuta el cierre de sesión automáticamente al montarse. Limpia `token`, `usuario`, `tendero`, `lastActive` y redirige a `/login`.

### 4.5 Hooks Personalizados

#### 4.5.1 `useLogin.ts`

Gestiona el estado del formulario de login y la comunicación con `POST /api/auth/login`.

**Lógica de redirección por rol:**

- Si la respuesta incluye `tendero` -> guarda en storage y redirige a `/(tabs)/dashboard`.
- Si no incluye `tendero` -> remueve clave del storage y redirige a `/(tabs)/vistaUsuario`.
- Intenta obtener el nombre del usuario desde `/clientes/me` como fallback para el mensaje de bienvenida.

#### 4.5.2 `useDashboard.ts`

Consume `GET /api/dashboard` y transforma los datos para la UI.

**Transformaciones:**

- `formatCOP`: Formatea montos con separador de miles en español (ej. `$1.500.000,00`).
- `getInitials`: Extrae las iniciales del nombre (máximo 2 letras).
- `getAvatarColor`: Asigna colores cíclicos a los avatares.
- Filtros de fecha implementados en cliente (`isHoy`, `isSemana`, `isMes`).
- Búsqueda por nombre de cliente en los movimientos.

#### 4.5.3 `useClients.ts`

Consume `GET /api/clientes` y mapea la respuesta al tipo `Cliente`.

**Campos mapeados:**

- `initials` y `bgColor` para avatares.
- `subtitulo` y `subtituloTipo` basados en `total_deuda`.
- `monto` formateado como string de moneda.
- `estado` derivado de la deuda (`mora` vs `al_dia`).

**Filtros locales:**

- Por nombre (case-insensitive).
- Por estado (`todos`, `mora`, `al_dia`, `sin_deuda`).

#### 4.5.4 `useVistaUsuario.ts`

Consume `GET /api/clientes/me` y `GET /api/clientes/{id}/historial`.

**Cálculos:**

- `nivelConfianza`: `(scoring.puntaje / 1000) * 100`, limitado a 100%.
- `nivelConfianzaLabel`: `"¡Excelente Cliente!"` (>=70%), `"Cliente normal"` (>=40%), `"Cliente en riesgo"` (<40%).
- Formatea el teléfono de la tienda para WhatsApp (prefijo `+57` si no lo tiene).

**Historial:**

- Combina créditos (tipo `CARGO`, color rojo) y abonos (tipo `ABONO`, color verde) en un solo array.
- Ordena cronológicamente descendente.

#### 4.5.5 `useSessionTimeout.ts`

Implementa seguridad de sesión por inactividad.

**Comportamiento:**

- **Cold start**: Si la app se abre con un token existente, lo invalida inmediatamente y redirige a login. Esto garantiza que al cerrar y reabrir la app no quede sesión activa.
- **Background**: Al pasar a segundo plano, guarda `lastActive = Date.now()`.
- **Foreground**: Al volver a primer plano, calcula el tiempo transcurrido. Si supera 1 minuto (`TIMEOUT_DURATION`), invalida la sesión y redirige a login.
- Remueve todas las claves de sesión: `token`, `usuario`, `tendero`, `lastActive`.

### 4.6 Estilos y Tema Visual

#### 4.6.1 Paleta de Colores (`constants/colors.ts`)

```ts
export const COLORS = {
  primary: '#00D09E',    // Verde principal
  bg: '#F0FAF4',         // Fondo claro
  white: '#FFFFFF',
  text: '#1A2E22',       // Texto principal
  textMuted: '#7A9A85',  // Texto secundario
  border: '#C8E6D2',
  inputBg: '#E8F5EE',
};
```

#### 4.6.2 Tema Extendido (`constants/theme.ts`)

Define una paleta más completa para modo claro y oscuro:

```ts
palette = {
  primary: '#16C7A6',
  surface: '#EAF9E8',
  successSoft: '#BFEBC4',
  successSoft2: '#D6F1AE',
  highlight: '#FFF2A3',
  text: '#0B2B2A',
  textMuted: '#2F5D5A',
  track: '#0E4E4B',
  card: '#F7FFF3',
  tabBarBg: '#DDE8DE',
};
```

Incluye la configuración de fuentes (`AppFonts`) usando la familia **Poppins** en pesos: Regular, SemiBold, Bold, ExtraBold y Black.

#### 4.6.3 Estilos por Pantalla

Cada pantalla tiene su archivo de estilos dedicado en `constants/`:

- `login.styles.ts`: Diseño de dos secciones (header verde + card blanca con `borderTopLeftRadius` y `borderTopRightRadius`).
- `dashboard.styles.ts`: Tarjetas de totales, grid de stats, lista de actividad con divisores, botones outline/fill.
- `vistaUsuario.styles.ts`: Tarjeta de deuda con gradiente visual, barra de progreso personalizada, lista de movimientos.
- `Clients.styles.ts`: Cards de cliente con layout de 3 columnas (avatar, info, monto+badge).
- `registerClientes.styles.ts`: Estilos del formulario de registro.

---

## 5. Scripts y Utilidades

### 5.1 Seed de Base de Datos (`backend/scripts/seed_database.js`)

Script de Node.js que limpia y pobla la base de datos con datos coherentes para pruebas.

**Datos creados:**

- 1 usuario tendero (`tendero@fiado.com` / `password123`).
- 2 usuarios clientes (`cliente1@gmail.com`, `cliente2@gmail.com`).
- 1 tendero asociado al primer usuario.
- 2 clientes asociados al tendero.
- 3 créditos con montos variados ($50,000, $20,000, $100,000).
- 3 abonos parciales sobre los créditos.

**Uso:**

```bash
cd backend
node scripts/seed_database.js
```

### 5.2 Fix Password (`backend/scripts/fixPassword.js`)

Script auxiliar para actualizar contraseñas en la base de datos.

---

## 6. Seguridad

### 6.1 Autenticación

- **JWT**: Tokens firmados con secreto configurable (`JWT_SECRET`), expiración de 24 horas.
- **Hash de tokens**: Cada token generado almacena su hash SHA256 en la tabla `sesiones`. Esto permite revocación inmediata en logout.
- **Estado de usuario**: Solo usuarios con `estado = 'activo'` pueden iniciar sesión.

### 6.2 Autorización

- **Aislamiento de datos**: Cada tendero solo accede a clientes, créditos, abonos y métricas vinculadas a su `id_tendero` mediante la relación `tendero_cliente`.
- **Verificación de pertenencia**: Los endpoints que reciben `clienteId` o `creditoId` verifican si el recurso pertenece al tendero autenticado antes de responder.

### 6.3 Sesiones en Mobile

- **Almacenamiento seguro**: Tokens y datos de sesión se guardan en `AsyncStorage`.
- **Timeout por inactividad**: La sesión se invalida automáticamente si la app permanece 1 minuto en segundo plano o si se cierra y reabre.
- **Logout completo**: Al cerrar sesión se remueven todas las claves relacionadas (`token`, `usuario`, `tendero`, `lastActive`).

### 6.4 Validaciones

- Contraseñas hasheadas con `bcryptjs` (salt rounds: 10).
- Validación de campos obligatorios en endpoints de creación/actualización.
- Rechazo de montos negativos o cero en abonos.

---

## 7. Flujos de Usuario Completos

### 7.1 Flujo Tendero

```
1. Abre app -> Index detecta token + tendero -> redirige a /(tabs)/dashboard
2. Dashboard muestra resumen de cartera y actividad reciente
3. Navega a "Clientes" -> Lista filtrable y buscable de clientes
4. Selecciona un cliente -> (TODO: detalle de cliente)
5. Desde Dashboard puede registrar nuevo crédito o pago (TODO)
6. Perfil -> Cerrar sesión -> Limpia storage -> Login
```

### 7.2 Flujo Cliente

```
1. Abre app -> Index detecta token (sin tendero) -> redirige a /(tabs)/vistaUsuario
2. Vista Usuario muestra:
   - Nombre de la tienda asociada
   - Total a pagar
   - Nivel de confianza basado en scoring
   - Historial de movimientos (créditos y abonos)
3. Botón "Contactar a la Tienda" abre WhatsApp
4. Perfil -> Cerrar sesión -> Limpia storage -> Login
```

### 7.3 Flujo Registro

```
1. En Login -> Toca "Registrarse"
2. (TODO: navegación a registro de tendero)
3. Registro de cliente disponible en endpoint /api/auth/registerClientes
```

---

## 8. Estado Actual del Desarrollo

### Implementado (Completo)

| Módulo                     | Estado   | Detalle                                                        |
| -------------------------- | -------- | -------------------------------------------------------------- |
| Backend API                | Completo | 10 módulos de rutas funcionales con validaciones               |
| Autenticación JWT          | Completo | Login, logout, registro de clientes, sesiones revocables       |
| Dashboard Tendero          | Completo | KPIs, actividad reciente, búsqueda, filtros de fecha           |
| Clientes (Tendero)         | Completo | Lista, filtros, búsqueda, avatares, badges                     |
| Créditos                   | Completo | CRUD, filtros, estados, días de atraso                         |
| Abonos                     | Completo | Registro con transacción, actualización automática de saldo    |
| Cartera                    | Completo | Resumen, desglose por cliente, vencidos por rango              |
| Scoring                    | Completo | Cálculo en 4 variables, niveles de riesgo, límite sugerido     |
| Alertas                    | Completo | Listado, tipos, marcado como leída                             |
| Analítica                  | Completo | Indicadores, pagos diarios, predicción de flujo                |
| Reportes                   | Completo | Resumen ejecutivo + exportación HTML                           |
| App Mobile - Login         | Completo | UI con validaciones, toggle de contraseña, redirección por rol |
| App Mobile - Dashboard     | Completo | Integración con API, filtros, búsqueda animada                 |
| App Mobile - Clientes      | Completo | Lista desde API, filtros, búsqueda, avatares                   |
| App Mobile - Vista Usuario | Completo | Datos propios, historial combinado, contacto WhatsApp          |
| App Mobile - Perfil/Logout | Completo | Cierre de sesión con confirmación y timeout                    |
| Seguridad de Sesión        | Completo | Timeout por inactividad, invalidación en cold start            |
| Seed Database              | Completo | Script de poblado con datos de prueba                          |

### Parcial / Placeholder

| Módulo               | Estado      | Detalle                                             |
| -------------------- | ----------- | --------------------------------------------------- |
| Registro de Tenderos | Placeholder | No hay pantalla de registro para tenderos en la app |
| Nuevo Crédido (UI)   | Placeholder | Botón existe en Dashboard pero no navega            |
| Registrar Pago (UI)  | Placeholder | Botón existe en Dashboard pero no navega            |
| Detalle de Cliente   | Placeholder | `handleClientePress` en `useClients.ts` está vacío  |
| Recuperar Contraseña | Placeholder | Muestra alerta "Próximamente"                       |
| Login con Google     | Placeholder | Muestra alerta "Próximamente"                       |
| Wallet (Cliente)     | Placeholder | Tab existe pero contenido no desarrollado           |
| Transfer             | Oculto      | Tab configurada con `href: null`                    |
| n8n Integración      | Vacío       | Carpeta reservada, sin contenido                    |

---

## 9. Notas de Implementación

1. **Base de datos**: El backend está configurado para NeonDB (PostgreSQL cloud). Para desarrollo local, actualizar `DATABASE_URL` en `.env`.

2. **SSL**: La conexión a base de datos fuerza `ssl.rejectUnauthorized: false`, lo cual es necesario para NeonDB pero debe revisarse en producción propia.

3. **CORS**: Habilitado globalmente (`app.use(cors())`). En producción, restringir al dominio de la app móvil.

4. **Scoring y alertas**: El sistema calcula scoring bajo demanda (al llamar `POST /api/scoring/:id/calcular`). Las alertas se asumen pre-pobladas en base de datos; no hay job automatizado detectado en el código actual.

5. **Exportación PDF**: Actualmente genera HTML formateado. Para conversión real a PDF se requiere integrar una librería como `puppeteer` o `pdfmake`.

6. **Webhooks**: Existe un endpoint de prueba `POST /webhooks/test` que solo imprime en consola. La carpeta `n8n/` está reservada para futuras automatizaciones.

---

## 10. Próximos Pasos Sugeridos

1. **Registro de Tenderos**: Crear pantalla de registro en la app y endpoint correspondiente en el backend.
2. **Navegación a acciones**: Implementar flujos de "Nuevo Crédito" y "Registrar Pago" desde el Dashboard.
3. **Detalle de Cliente**: Crear pantalla `/clientes/[id]` con historial completo.
4. **Wallet del Cliente**: Desarrollar contenido funcional de la pestaña Wallet.
5. **Alertas Push**: Integrar notificaciones push para alertas de mora.
6. **Tests unitarios**: Implementar suite de tests con Jest en backend.
7. **Validación de campos**: Agregar `Joi` o `express-validator` en endpoints de escritura.
8. **Paginación**: Implementar paginación en listados de clientes, créditos y abonos.
9. **Rate Limiting**: Agregar `express-rate-limit` para prevenir ataques.
10. **Pipeline CI/CD**: Configurar GitHub Actions para tests y despliegue automático.

---

*Documento generado a partir del analisis del codigo fuente del proyecto FiadoCheck.*
