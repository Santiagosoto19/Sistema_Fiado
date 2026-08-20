# Credenciales de prueba — FiadoCheck

> Cuentas **desechables** de la base de desarrollo (NeonDB compartida).
> No son credenciales de producción. Ver la nota de seguridad al final.

## Cuentas usables

| Rol | Email | Contraseña | Datos asociados |
|-----|-------|------------|-----------------|
| **Tendero A** | `carlos.mendez@fiado.com` | `FiadoTest2026` | `id_tendero = 1` · 7 créditos · 4 clientes (niveles bajo y medio) |
| **Tendero B** | `tendero1@tiendasegura.com` | `FiadoTest2026` | `id_tendero = 6` · 2 créditos · 1 cliente (nivel medio) |
| **Tendero C** | `pedro.garcia@fiado.com` | `FiadoTest2026` | `id_tendero = 3` · 7 créditos · cliente 5 con **nivel alto** |
| **Cliente** | `ana.ruiz@gmail.com` | `FiadoTest2026` | `id_cliente = 1` · nivel medio |

> **NO usar `soto@fiado.com`.** Tiene fila en la tabla `tenderos` pero su usuario está
> con `id_rol = 2` (cliente), así que el login emite el JWT con `id_tendero = null` y
> todos los endpoints de scoring devuelven `404 Cliente no encontrado`.
> Causado por `backend/scripts/fixSotoAsCliente.js`.

## Mapa de casos por tendero

Ningún tendero de la base tiene clientes con crédito en los tres niveles a la vez.

| Caso | Tendero | Cliente | Condición |
|---|---|---|---|
| REC-01 | A | `999999999` | No existe |
| REC-02 | A | `6` | Existe, sin vínculo |
| REC-03 | A | `59` | Vinculado, 0 créditos |
| REC-04 | A | `2` | Nivel bajo, 3 créditos |
| REC-05 / REC-07 | A | `1` | Nivel medio, 3 créditos |
| REC-06 | **C** | `5` | Nivel alto, 3 créditos |
| SCO-01/03/05/08 | B | `6` | Historial con el tendero 6 |
| SCO-04 | B | `1` | Cliente ajeno al tendero 6 |

## Clientes de Tendero A por nivel de riesgo

Cubren los tres niveles sin necesidad de fabricar datos. Sirven directamente para REC-04, REC-05 y REC-06.

| `id_cliente` | Nivel | Confianza | Créditos con Tendero A |
|---|---|---|---|
| `4` | bajo | 1.0000 | 3 |
| `1` | medio | 0.8700 | 4 |
| `1035770283` | alto | 1.0000 | 3 |

## Otros identificadores útiles

| Para | Valor | Motivo |
|---|---|---|
| SCO-04 (cliente ajeno) | `id_cliente = 2` | Vinculado al tendero 1, no al 2 |
| SCO-09c (sin scoring) | `id_cliente = 56` | Existe pero no tiene fila en `scoring` |
| REC-02 (sin vínculo) | 13 clientes disponibles | Sin ningún `tendero_cliente` activo |

## Estado de la base

- 130 usuarios: **30 con hash bcrypt real, 100 con hash de relleno** (`$2b$12$Ex.Placeholder…`) que **no pueden iniciar sesión**.
- Esos 100 usuarios sí aportan datos: son dueños de 50 de las 57 filas de `scoring` y de 80 de los 124 créditos. **No borrarlos**: el Random Forest quedaría entrenado con 7 muestras y las pruebas de recomendación se volverían inestables.

## Limpieza de datos generados por las colecciones

```sql
DELETE FROM usuario WHERE email LIKE '%@test.fiadocheck.com';
```

## Nota de seguridad

Este archivo contiene contraseñas en texto plano, igual que `backend/scripts/fixPassword.js`. Es aceptable para cuentas de una base de desarrollo, pero conviene:

1. Añadir este archivo a `.gitignore` si el repositorio llega a ser público.
2. Registrar el hallazgo en **SEC-07** ("sin secretos en el repo") del plan de pruebas, que es responsabilidad de Benis.

Ninguna de estas cuentas debe existir en el entorno productivo de Azure.
