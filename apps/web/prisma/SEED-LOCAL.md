# Seed local v3 — incorporación de desarrolladores

En el entorno actual, Docker utiliza el proyecto `next-monorepo`, el servicio `postgres` y el contenedor `next-monorepo-postgres-1`; la base se llama **postgres** y ya fue reconstruida con seed v3. Los ejemplos de otra base local que siguen son para instalaciones independientes, no para cambiar el nombre del entorno actual.

Requisitos: Node.js 20 o superior, pnpm 10 y una base PostgreSQL local exclusiva
para pruebas. Ejecuta los comandos desde la raíz del monorepo.

## Cambios de la versión 3

- Requiere las cuatro migraciones, incluidos patient_code_seq, auth_throttles, email_outbox, CHECK, exclusión de horarios, índice único de DNI y los cuatro triggers activos.
- Rechaza una estructura incompleta antes de escribir datos. El seed no crea tablas ni reemplaza migrate deploy.
- Usa códigos numéricos #PAC-0001 generados mediante nextval; conserva los códigos numéricos existentes y actualiza los antiguos códigos demo.
- Conserva los UUID de fixtures v2 para no duplicarlos. Repetir conserva DNI y códigos de paciente.
- Ejecuta el conjunto en una transacción Serializable. No crea sesiones ni tokens de recuperación; invalida los anteriores de las cuentas demo y elimina sus trabajos de correo pendientes.
- Incluye las seis plantillas de correo de demostración, sin enviar mensajes.
- Esta versión crea datos válidos para una BD limpia migrada; no cancela citas antiguas ajenas al seed ni corrige información real.

## 1. Configurar el entorno

Instala dependencias con `pnpm install --frozen-lockfile`. Si no tienes
`apps/web/.env`, copia `apps/web/.env.example` a esa ruta. Conserva tu archivo
existente si ya tienes configuración local.

Crea previamente el usuario y la base PostgreSQL local con las herramientas de tu
instalación. Configura ambos destinos con credenciales reales de PostgreSQL:

```dotenv
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/biodentis_local?schema=public"
DIRECT_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/biodentis_local?schema=public"
SEED_DEMO_PASSWORD="BiodentisLocal2026!"
JWT_ACCESS_SECRET="reemplazar-por-un-secreto-local-aleatorio"
JWT_REFRESH_SECRET="reemplazar-por-otro-secreto-local-aleatorio"
FRONTEND_URL="http://localhost:3000"
EMAIL_MODE=test
```

La contraseña del ejemplo es solo para una base local de demostración. Puedes
cambiarla por cualquier valor de al menos 12 caracteres y hasta 72 bytes UTF-8.
Si la contraseña de PostgreSQL contiene caracteres especiales, codifícalos en la URL.
Prisma carga `apps/web/.env` al ejecutar `pnpm db:seed` con esta configuración.
El seed no carga `.env.local`. Variables ya definidas en la terminal pueden
prevalecer sobre `.env`.

Se rechaza `NODE_ENV=production` y cualquier destino fuera de `localhost`,
`127.0.0.1` o `[::1]`, tanto en `DATABASE_URL` como en `DIRECT_URL`. Usa una
instancia verdaderamente local; un túnel local hacia una base compartida también
redirigiría las escrituras a esa base. Los nombres de servicio de Docker no están
admitidos: ejecuta el seed desde el host con el puerto publicado en localhost.

## 2. Inicializar una base VACÍA

```bash
pnpm db:generate
pnpm --filter web exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Las migraciones versionadas ya sustituyen el índice inicial, protegen intervalos
solapados y crean las restricciones y las tablas de avisos/control de acceso.
No hace falta ejecutar el SQL adicional de cancelaciones en una instalación nueva.
El seed no modifica el esquema ni ejecuta migraciones.

Si aparece **P3005**, la base no está vacía: este seed no corrige el historial.
Usa otra base local vacía o reconcilia la estructura existente y su baseline antes
de ejecutar estos pasos. No marques la migración como aplicada sin comparar su
SQL con la estructura real. No necesitas resetear ni borrar tu base existente.

## 3. Iniciar sesión

Todas estas cuentas reciben **el valor de `SEED_DEMO_PASSWORD`** al ejecutar el seed:

| Rol | Correo | Estado |
| --- | --- | --- |
| Administrador | `admin@biodentis.com` | Activo |
| Recepción | `recepcion@biodentis.com` | Activo |
| Odontólogo general | `dr.martinez@biodentis.com` | Activo |
| Endodoncista | `dra.rivas@biodentis.com` | Activo |
| Cirujano oral | `dr.valdes@biodentis.com` | Activo |
| Paciente principal | `paciente@biodentis.com` | Activo |
| Otros pacientes | `paciente2@example.test` a `paciente12@example.test` | Activos |
| Paciente para probar bloqueo de acceso | `paciente.inactivo@example.test` | Inactivo |

Con el ejemplo anterior, el administrador entra con `admin@biodentis.com` y
`BiodentisLocal2026!`. La contraseña no se imprime en consola ni se guarda en Git.

## 4. Datos y escenarios

- 18 usuarios: 1 administrador, 1 recepcionista, 3 dentistas y 13 pacientes.
- 3 especialidades enlazadas a los dentistas, 9 servicios reservables y 3 sillones.
- Horarios de 08:00 a 18:00 los siete días (horario ficticio deliberado para poder
  probar reservas cualquier día de incorporación).
- 27 citas sin cruces entre fixtures, con duración acorde al servicio: 9 de hoy,
  9 históricas y 9 futuras. Incluyen los cinco estados y pacientes en espera.
- 6 notas clínicas en citas atendidas y 3 planes activos, cada uno con dos sesiones
  completadas y una tercera futura del mismo paciente, dentista y servicio.
- 3 solicitudes de cancelación: pendiente, aprobada y rechazada. La pendiente y la
  rechazada conservan la cita confirmada; la aprobada tiene la cita cancelada.
- 3 excepciones futuras: dentista (+10 días), clínica (+11) y unidad (+12), sin
  citas demo afectadas.
- Clínica, configuración, plantillas de correo, auditoría y stock normal, bajo y cero.
- Las citas pasadas usan fechas civiles y notas con instantes interpretados en Lima.

Los pacientes principales `paciente@biodentis.com`, `paciente4@example.test` y
`paciente7@example.test` tienen historial y plan. `paciente10@example.test` a
`paciente12@example.test` permiten probar pacientes sin citas.

No se crean sesiones, tokens de recuperación ni envíos de correo. Los correos de
login históricos `@biodentis.com` se conservan por compatibilidad con las pruebas.
Mantén `EMAIL_MODE=test`; el proveedor de correo solo es necesario para probar
entrega real a un destinatario de pruebas autorizado.

## 5. Repetir el seed

```bash
pnpm db:seed
```

Usa identificadores estables y upserts: no acumula copias de sus fixtures y
recalcula las citas respecto al día actual de Lima. **Restaura datos y contraseñas
de las cuentas demo, incluidos los administradores demo ya existentes**, y revoca
sus refresh tokens. Una sesión con access token ya emitido puede durar hasta su
expiración. No debes usar estas cuentas para conservar cambios manuales.

También restaura los fixtures de catálogo, citas, planes, clínica y configuración.
No elimina registros ajenos ni los datos que dejó el seed anterior. Se recomienda
una base vacía para obtener exactamente el conjunto descrito. Si otros datos
ocupan sus claves únicas, la ejecución falla y revierte sus escrituras.

La carga es una única transacción. No ejecutes dos seeds simultáneamente ni lo
uses mientras otras personas escriben en esa base de pruebas.

## Verificaciones sin conexión a la base

```bash
pnpm --filter web test:seed
pnpm typecheck
pnpm lint
```

Las pruebas unitarias verifican destino local, contraseña, fechas de Lima,
identificadores estables, ausencia de cruces y coherencia de las sesiones.
