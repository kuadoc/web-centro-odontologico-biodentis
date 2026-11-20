# BIODENTIS — aplicación web

Aplicación Next.js 16 del monorepo, con Prisma/PostgreSQL, Zod compartido,
autenticación propia, Gmail SMTP y Supabase Storage mediante S3.

Desde la raíz del repositorio:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd --filter web exec prisma generate
pnpm.cmd --filter '@biodentis/shared-types' build
pnpm.cmd dev
```

La configuración local está en `.env.example`; copiar sus nombres a `.env`
y completar los valores localmente. Nunca versionar credenciales ni respaldos.

## Validación

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd --filter web test:auth-service
pnpm.cmd --filter web test:email
pnpm.cmd --filter web test:reports
pnpm.cmd --filter web test:storage
pnpm.cmd build
```

## Base de datos y despliegue

El build genera el cliente Prisma y compila Next.js; no aplica migraciones.
La actualización de producción es un paso separado que conserva los datos.

- [Actualización segura de producción](../../docs/actualizacion-produccion.md).
- [Seed v3, exclusivo para desarrollo local](prisma/SEED-LOCAL.md).
- [Configuración de imágenes y Storage](../../docs/almacenamiento-imagenes.md).
- [Reportes y recordatorios](../../docs/HU14-reportes-y-recordatorios.md).

La ruta antigua `/api/cron/reminders` es un alias del mismo trabajador de
`/api/cron/email-outbox`; programar solo este último. La plantilla de cron de
`docs` no está activa automáticamente y debe adaptarse al plan de Vercel.