# Actualización de BIODENTIS conservando datos

## Estado y alcance

Referencia de producción: `master`, PR #10, commit `b47c1a2` del 11 de noviembre
de 2026. Versión funcional subida a `develop`: `debffcd`. Estas referencias de
Git no prueban la estructura real de Supabase ni el entorno usado por Vercel.

El build no migra la base. No integrar el PR hasta verificar el esquema remoto,
el respaldo y su restauración, el ensayo de migraciones y las variables de Vercel.
No ejecutar reset, seed de demostración, `db push` ni scripts locales de
reconstrucción sobre producción. No eliminar tablas de la aplicación ni objetos
de Storage. Los datos de usuarios, citas e historias clínicas se conservan.

## Acceso seguro

Configurar `apps/web/.env.production.local`, ignorado por Git, con `DATABASE_URL`
de aplicación y `DIRECT_URL` para herramientas. No copiar credenciales al chat,
a documentación, al PR ni a argumentos de comandos. La conexión de herramientas
debe ser directa o de sesión compatible con Prisma 6; no usar el pool transaccional
para operaciones administrativas que requieran continuidad de sesión.

La sesión de Vercel debe permitir verificar el proyecto, la rama productiva,
las variables de Preview/Production, el plan y la configuración del programador.
Preview debe usar una base de pruebas y correo de prueba con destinatario autorizado.

## Orden operativo

1. Revisar y versionar los cambios de preparación y recuperar el CI de `master`.
   Resolver cualquier conflicto de integración conservando las funcionalidades
   nuevas. El workflow solo valida; no recibe credenciales de producción ni migra.
2. Ejecutar tipos, lint, pruebas y build. Guardar el SHA exacto que pasó los controles.
3. Inspeccionar Supabase en lectura. Desde la raíz:

   ```powershell
   node --env-file=apps/web/.env.production.local apps/web/scripts/check-production-database.cjs
   ```

   La herramienta exige un host Supabase y usa una transacción PostgreSQL de solo
   lectura. Informa tablas, columnas, restricciones, índices, triggers, secuencias,
   historial, checksums, concesiones a roles de API e incidencias agregadas; no
   imprime credenciales ni filas personales. Código de salida 2 significa que
   existen bloqueos que requieren revisión. Su éxito no autoriza migrar por sí solo.
   Para probarla en `postgres` local usar `.env` y añadir `--local`.
4. Crear un respaldo lógico de la base productiva con una versión de `pg_dump`
   compatible con el servidor. Guardarlo fuera de Git y comprobar restauración,
   estructura y conteos en una base aislada. La comprobación no es un respaldo.
5. Comparar las migraciones reales. Si falta `_prisma_migrations`, preparar y
   verificar un baseline equivalente; nunca marcar la inicial a ciegas. Resolver
   checksums distintos, migraciones incompletas, tablas/columnas divergentes y datos
   que incumplan DNI, horarios, solapamientos, teléfonos o integridad clínica.
6. Ensayar las migraciones pendientes en la copia restaurada. Revisar también
   permisos y RLS de las tablas nuevas: no exponer `auth_throttles`, `email_outbox`
   ni `scheduled_job_runs` por la API pública. Validar con el rol real de Prisma.
7. Preparar la ventana de actualización y la reversión. Confirmar que las nuevas
   restricciones sean compatibles con la versión antigua mientras dure la transición.
   Un rollback de Vercel no revierte SQL; mantener las migraciones aditivas y preparar
   una estrategia de recuperación de BD antes de la ejecución.
8. Aplicar solo las migraciones verificadas mediante `prisma migrate deploy` con
   el entorno productivo cargado explícitamente en el proceso. El script `db:migrate`
   del paquete usa `migrate dev`: no usarlo en producción. No añadir una migración
   automática a los builds de Preview ni imprimir las cadenas de conexión.
9. Verificar que el estado de migraciones y los controles de integridad sean correctos.
   Integrar/publicar el SHA validado en `master` y comprobar el despliegue productivo.
10. Activar un solo programador para `/api/cron/email-outbox`, con `CRON_SECRET`.
    Verificar frecuencia, plan y duración máxima de ejecución. La plantilla en
    `docs/vercel-cron.example.json` no está activa; el alias `/api/cron/reminders`
    no debe tener un segundo programador. Con correo de prueba autorizado comprobar
    un ciclo, sus reintentos y su registro en `scheduled_job_runs`.
11. Comprobar login, recuperación, citas y concurrencia, historias clínicas, permisos,
    reportes, fotos y recepción efectiva de correo. Revisar errores y conteos de BD.
    Las pruebas no deben enviar mensajes a pacientes ni borrar datos existentes.

## Migraciones candidatas respecto a la referencia

| Orden | Migración | Cambios |
| --- | --- | --- |
| 1 | `20261118000000_integrity_and_delivery` | Integridad, exclusión de horarios, triggers, throttle y outbox |
| 2 | `20261118010000_contact_and_confirmation` | Contactos, notas y confirmaciones |
| 3 | `20261119000000_atomic_patient_codes` | Secuencia de códigos inicializada con el máximo existente |
| 4 | `20261119010000_reports_and_reminders` | Resultado de outbox y ejecuciones de recordatorios |
| 5 | `20261120000000_protect_operational_tables` | RLS, revocación de permisos públicos y nombre de índice alineado con Prisma |

La migración inicial publicada no se modifica. Ninguna de las cinco carga datos
del seed ni elimina registros de pacientes. Las restricciones pueden detener la
aplicación si hay datos incompatibles; el preflight no los corrige automáticamente.

## Fotos y configuración

Las nuevas fotos usan Supabase S3 y `users.avatarUrl`. Se mantienen compatibles las
referencias históricas a `/images` y data URL; no hay migración automática ni barrido
del bucket. Se guarda un único WebP por foto nueva. Los retratos de odontólogos
conservan los bytes de entrada en el navegador y usan compresión WebP sin pérdida,
con un lado mayor máximo de 1600 px; las fotos ya degradadas requieren su original.

Producción requiere SMTP, `EMAIL_MODE` elegido conscientemente, `FRONTEND_URL` HTTPS
correcto, JWT, conexiones de BD, `STORAGE_DRIVER=s3` y credenciales S3 del servidor.
Mantener los secretos JWT actuales evita invalidar sesiones por un cambio innecesario.
La duración del trabajador, Storage y SMTP debe validarse contra el plan real de Vercel.

## Evidencia de preparación local

- Build Next.js de producción completado con el envío de correo bloqueado.
- 92 pruebas de autenticación, correo simulado, reportes, Storage y cron aprobadas.
- `/api/cron/reminders` reutiliza la autorización y el trabajador persistente nuevo.
- CI restaurado para `develop` y PR a `master`, sin migraciones automáticas.
- Conexión productiva, respaldo del esquema público y ensayo: verificados en el
  apartado siguiente. Variables de Vercel, programador y publicación: pendientes.

## Lectura productiva y ensayo del 20 de noviembre de 2026

La revisión en Session Pooler confirmó PostgreSQL 17.11, la migración inicial
reconocida, checksums sin conflictos y ausencia de incidencias en el preflight.
Las 21 tablas públicas existentes tenían RLS activado y ninguna política; el rol
servidor usado por Prisma tiene bypass de RLS. Las cuatro migraciones funcionales
nuevas seguían pendientes. No se aplicaron cambios en producción.

Se creó un respaldo consistente del esquema público de la aplicación mediante
snapshot de solo lectura. El archivo privado está en `.backups/`, excluido de Git;
no incluye los esquemas administrados de Supabase ni los objetos de Storage.
La restauración en PostgreSQL 17 temporal coincidió en conteos y checksums de
todas las tablas, y las migraciones funcionales conservaron los registros existentes.

El ensayo detectó que las tablas operativas nuevas no activaban RLS, a diferencia
de la estructura productiva actual. Se añade una quinta migración para protegerlas
y revocar acceso a `anon`, `authenticated` y `PUBLIC`, sin modificar registros.
El ensayo confirmó RLS en las tres tablas nuevas, ausencia de concesiones de API
y rechazo de lectura por `anon` y `authenticated`, incluso simulando permisos
predeterminados amplios en la copia. Los registros existentes siguieron idénticos.
El resultado se registra de forma privada junto al respaldo. La publicación,
activación del programador y revisión de variables de
Vercel permanecen pendientes.
