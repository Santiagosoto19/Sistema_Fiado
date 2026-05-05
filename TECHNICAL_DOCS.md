# Documentación Técnica: Sistema FiadoCheck

Este documento detalla la implementación técnica de la aplicación FiadoCheck, enfocándose en la arquitectura de la aplicación móvil y la estructura de los Endpoints CRUD del backend.

## 1. Arquitectura de la Aplicación Móvil (Frontend)

La aplicación móvil está desarrollada con **React Native + Expo**, utilizando un sistema de rutas basado en archivos mediante `expo-router`.

### Estructura de Navegación y Rutas
La aplicación implementa una arquitectura de navegación híbrida:
- **Root Layout (`app/_layout.tsx`)**: Define el proveedor de contexto global, la carga de fuentes personalizadas (Poppins) y el `Stack` principal. Configura el ancla de navegación en el grupo `(tabs)`.
- **Tab Navigation (`app/(tabs)/_layout.tsx`)**: Gestiona el menú inferior. Aunque el sistema de pestañas define múltiples rutas, la experiencia del usuario ha sido optimizada para dirigir el flujo hacia la vista de cuenta.
- **Punto de Entrada Dinámico (`app/(tabs)/index.tsx`)**: Actualmente funciona como un controlador de redirección. Al iniciar la aplicación, el componente `HomeScreen` utiliza `<<RedirectRedirect href="/vistaUsuario" />` para enviar al usuario inmediatamente a la pantalla de su cuenta.
- **Vista de Usuario (`app/vistaUsuario.tsx`)**: Es la pantalla principal de la aplicación. Implementa una interfaz de alta fidelidad basada en capas (Shell Design).

### Detalles de Implementación de `vistaUsuario.tsx`
La vista se ha estructurado siguiendo un diseño de componentes funcionales con los siguientes módulos:

#### A. Header (AppBar)
- **Estilo**: Implementa un diseño de "cáscara" con bordes inferiores redondeados (`borderBottomLeftRadius: 28`).
- **Lógica**: Utiliza `useSafeAreaInsets` para gestionar la zona de estado (StatusBar) de forma nativa en iOS y Android.

#### B. Sistema de Diseño y Temas
- **Paleta de Colores**: Se integra con `constants/theme.ts` utilizando un objeto `palette`. Esto permite cambiar la apariencia de toda la app (colores primarios, superficies y textos) desde un único punto de configuración.
- **Tipografía**: Uso extensivo de la familia **Poppins** a través de `AppFonts`, diferenciando pesos (`Regular`, `SemiBold`, `Bold`, `Black`) para crear jerarquía visual.

#### C. Componentes de Interfaz (UI)
- **Card de Deuda**: Contenedor con bordes redondeados (`28px`) que agrupa la información financiera, utilizando sombras suaves para dar profundidad.
- **Módulo de Confianza**: Implementa una barra de progreso estilo "Pill" con un indicador de porcentaje dinámico y un badge de estado.
- **Lista de Movimientos**: Renderizado optimizado de transacciones donde cada ítem diferencia visualmente entre Abonos (color highlight) y Cargos (color primary).
- **CTA (Call to Action)**: Botón flotante vinculado a la API de `Linking` de React Native para comunicación directa vía WhatsApp.
- **Bottom Nav Personalizado**: Implementación de una barra de navegación de 3 elementos (Inicio, Perfil, Alertas) centrados y equidistantes.

---

## 2. Endpoints CRUD y Lógica de Backend

El backend está construido con Node.js y Express, interactuando con una base de datos PostgreSQL. La lógica de negocio se encuentra implementada directamente en las rutas para maximizar la velocidad de respuesta.

### A. Gestión de Clientes (`/api/clientes`)
Permite el ciclo de vida completo del cliente en la tienda.
- **Creación**: Valida datos básicos (nombre, teléfono, identificación).
- **Consulta**: Retorna no solo los datos personales, sino totales calculados de deuda y créditos pendientes.
- **Historial**: Endpoint especializado que concatena créditos y abonos para generar una línea de tiempo financiera del cliente.

### B. Gestión de Créditos/Deudas (`/api/creditos`)
Controla el monto que el cliente debe a la tienda.
- **Lógica de Saldo**: El `saldo_pendiente` se recalcula automáticamente cada vez que se asocia un nuevo abono al crédito.
- **Estados**: Maneja estados de `vigente`, `pagado` y `vencido` basados en la `fecha_limite_pago`.

### C. Gestión de Abonos/Pagos (`/api/abonos`)
Registra los pagos parciales o totales realizados por los clientes.
- **Flujo de Pago**: Al crear un abono (`POST`), el sistema:
    1. Registra el monto del pago.
    2. Resta el monto del `saldo_pendiente` del crédito asociado.
    3. Si el saldo llega a 0, marca el crédito como `pagado`.

### D. Sistema de Scoring (`/api/scoring`)
Implementa un algoritmo de riesgo crediticio basado en el comportamiento del cliente.
- **Cálculo**: El puntaje se basa en:
    - Frecuencia de pagos a tiempo.
    - Monto promedio de créditos solicitados.
    - Antigüedad del cliente en la tienda.
- **Niveles de Riesgo**: Clasifica al cliente en niveles (Ej: Bajo, Medio, Alto) que determinan el `limite_sugerido` de crédito.
