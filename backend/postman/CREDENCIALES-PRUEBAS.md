# Credenciales de prueba — FiadoCheck

> Cuentas **desechables** de la base de desarrollo (NeonDB compartida).
> No son credenciales de producción. Ver la nota de seguridad al final.

## Cuentas usables

| Rol | Email | Contraseña | Datos asociados |
|-----|-------|------------|-----------------|
| **Tendero A** | `carlos.mendez@fiado.com` | `FiadoTest2026` | `id_tendero = 1` · 4 clientes, todos en nivel alto tras BUG-012 |
| **Tendero B** | `tendero1@tiendasegura.com` | `FiadoTest2026` | `id_tendero = 6` · cliente 6 en **nivel bajo** (90 puntos) |
| **Tendero C** | `pedro.garcia@fiado.com` | `FiadoTest2026` | `id_tendero = 3` · cliente 5 en **nivel alto** (20 puntos) |
| **Tendero D** | `soto@fiado.com` | `123456` | `id_tendero = 2` · cliente 4 en **nivel bajo** (85 puntos) |
| **Tendero E** | `villa@gmail.com` | *(pedírsela a Santiago)* | `id_tendero = 1234567890` · cliente 1035770283 en **nivel medio** (60 puntos) |
| **Cliente** | `ana.ruiz@gmail.com` | `FiadoTest2026` | `id_cliente = 1` |

> **`soto@fiado.com` ya funciona.** Tenía fila en `tenderos` pero su usuario estaba con
> `id_rol = 2`, así que el login emitía el JWT con `id_tendero = null` y los endpoints de
> scoring devolvían `404`. Corregido en BUG-005 con `UPDATE usuario SET id_rol = 1`.

> **`villa@gmail.com` es la cuenta personal de Santiago Soto** (tienda "Villa Soto"), no
> una cuenta sembrada de pruebas. Se le fijó una contraseña conocida porque es el **único**
> par de toda la base que cumple "nivel medio CON créditos", condición que exige REC-05.
>
> Su contraseña **no se guarda en este archivo ni en la colección**, a diferencia de las
> demás, precisamente por ser una cuenta de una persona del equipo en un repositorio que
> leerán los evaluadores. Pídesela a Santiago y ponla en la variable `tenderoMedioPassword`
> de tu entorno de Postman. Avísale también, porque su contraseña anterior ya no sirve.

## El scoring es por par (cliente, tendero)

Desde BUG-012 la tabla `scoring` tiene una fila por cada par activo, no por cliente. **Un
mismo cliente puede tener nivel distinto en cada tienda**, así que un fixture solo es
válido junto con el tendero que lo consulta.

Ejemplo real: el cliente 4 (Rosa Peña) tiene 85 puntos y nivel bajo con el tendero 2, y
20 puntos y nivel alto con el tendero 4.

## Mapa de casos por tendero

Ningún tendero tiene clientes con crédito en los tres niveles a la vez, y tras BUG-012 el
reparto quedó polarizado: 28 pares en alto, 31 en bajo y solo 3 en medio.

| Caso | Tendero | Cliente | Condición |
|---|---|---|---|
| REC-01 | A | `999999999` | No existe |
| REC-02 | A | `6` | Existe, sin vínculo con A |
| REC-03 | A | `59` | Vinculado, 0 créditos → `sin_credito_tienda` |
| REC-04 | **D** | `4` | Nivel bajo, 3 créditos |
| REC-05 | **E** | `1035770283` | Nivel medio, 6 créditos |
| REC-06 | **C** | `5` | Nivel alto, 3 créditos |
| REC-07 | A | `1` | Solo requiere historial; no depende del nivel |
| SCO-01/03/05/08 | B | `6` | Historial con el tendero 6 |
| SCO-04 | B | `1` | Cliente ajeno al tendero 6 |

## Cartera del Tendero A

Ya **no** cubre los tres niveles. Sirve como referencia, no como fuente de fixtures por nivel.

| `id_cliente` | Nombre | Puntos | Nivel | Confianza | Créditos con A |
|---|---|---|---|---|---|
| `2` | Juan Pedroza | 50 | alto | 0.5600 | 3 |
| `1` | Ana Ruiz | 40 | alto | 1.0000 | 4 |
| `3` | Luis Castro | 10 | alto | 1.0000 | 1 |
| `59` | Soto Cliente | 0 | medio | `null` | 0 |

El cliente 2 está justo en la frontera de 50 puntos: las reglas lo sitúan en medio y el
Random Forest lo predice alto con solo 0,56 de confianza. No usarlo como fixture de nivel,
porque el resultado depende del modelo vigente.

## Otros identificadores útiles

| Para | Valor | Motivo |
|---|---|---|
| SCO-04 (cliente ajeno) | `id_cliente = 2` | Vinculado al tendero 1, no al 6 |
| SCO-09c (sin scoring) | `id_cliente = 56` | Existe pero no tiene fila en `scoring` |
| REC-02 (sin vínculo) | `id_cliente = 6` | Sin `tendero_cliente` activo con el tendero A |

## Estado de la base

- **131 usuarios**, de los cuales **99 tienen hash de relleno** (`$2b$12$Ex.Placeholder…`) y **no pueden iniciar sesión** (BUG-006).
- **No borrarlos.** Aportan la mayoría de las 64 filas de `scoring` y de los 125 créditos; sin ellos el Random Forest quedaría con un puñado de muestras. La vía correcta es fijar contraseñas conocidas solo a las cuentas que se necesiten, como se hizo con los tenderos de esta tabla.
- `scoring`: **64 filas**, una por par (cliente, tendero) activo.

## Limpieza de datos generados por las colecciones

```sql
DELETE FROM usuario WHERE email LIKE '%@test.fiadocheck.com';
```

## Nota de seguridad

Este archivo contiene contraseñas en texto plano, igual que `backend/scripts/fixPassword.js`. Es aceptable para cuentas de una base de desarrollo, pero conviene:

1. Añadir este archivo a `.gitignore` si el repositorio llega a ser público.
2. Registrar el hallazgo en **SEC-07** ("sin secretos en el repo") del plan de pruebas, que es responsabilidad de Benis.

Ninguna de estas cuentas debe existir en el entorno productivo de Azure.
