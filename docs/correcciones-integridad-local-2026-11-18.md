# Correcciones de acceso e integridad — validación local

No desplegar antes de validar con una copia de los datos reales. Las migraciones
nuevas fallan si encuentran datos inválidos; no borran ni corrigen registros en
silencio. La migración inicial publicada se conserva sin cambios.

## Cambios por prioridad

| Prioridad | Cambio preparado | Verificación necesaria |
| --- | --- | --- |
| P0 | Login sin bloqueo heredado de otras cuentas en la misma IP; contadores PostgreSQL compartidos. Contraseñas válidas recuperan acceso; el límite de volumen es independiente. | Registro, logout, reingreso, errores previos, IP ausente, concurrencia del contador. |
| P0 | Notas clínicas exclusivas del odontólogo activo asignado; flujo alternativo resuelve Dentist por userId y valida cita/paciente/estado. | Permisos, atribución y fallo de auditoría sin escrituras parciales. |
| P1 | Nota, atención y auditoría atómicas; Recepción no recibe notas clínicas en el listado. | Rollback y respuestas según rol. |
| P1 | Migraciones versionadas con índice parcial, exclusión de intervalos, CHECK, DNI único y FK de cancelledById. | Preflight sin incidencias; migración y concurrencia en PostgreSQL. |
| P1 | Regla de más de 24 horas en America/Lima; cuestionario obligatorio en reserva online. | Límite exacto, formularios y API. |
| P2 | Cancelación propia con identidad, estado, anticipación y trazabilidad. | Propiedad de la cita y liberación del horario. |
| P2 | Bajas/excepciones cancelan PENDING; bloquean si afectan CONFIRMED. Cancelaciones, auditoría y avisos en la transacción. | Casos permitidos, bloqueados y fallos concurrentes. |
| P2 | Registro presencial con nombre, apellido y teléfono; email y contraseña opcionales. | Crear contacto y seleccionarlo para cita; sin correo se usa identificador técnico @patients.invalid y contraseña aleatoria no entregada. |
| P2 | Validaciones de contacto y RUC; categorías sincronizadas; referencias clínicas derivadas comprobadas al commit. | Datos históricos, renombrado de especialidad y preflight. |
| P2 | Outbox transaccional para reservas, confirmaciones y cancelaciones. | Entrega inmediata, reintentos, exclusión entre trabajadores y activación del scheduler. |
| P3 | HU consolidadas y decisiones de normalización documentadas. | Revisión funcional por responsables del negocio. |

## Preparación para bases existentes

1. Obtener respaldo y una copia local de la base real, sin publicar datos sensibles.
2. Revisar las variables de aplicación y de migraciones (`DATABASE_URL` y `DIRECT_URL`).
3. Ejecutar `apps/web/prisma/preflight-integrity.sql` con un cliente PostgreSQL en
   la copia local. Devuelve identificadores de incidencias y copias de categorías
   desincronizadas. Revisar cada caso con el responsable de los datos.
4. Si la base tiene tablas pero carece de historial Prisma (P3005), comparar su
   estructura con `20261111000000_init` y establecer el baseline correcto. No marcar
   migraciones posteriores como aplicadas sin ejecutar/reconciliar sus cambios.
5. Ejecutar `pnpm --filter web exec prisma migrate deploy` en local y después
   `pnpm db:generate`. La extensión `btree_gist` requiere permisos en esa base.
6. Probar los flujos por rol antes de promover código o migraciones.

Las nuevas migraciones son `20261118000000_integrity_and_delivery` y
`20261118010000_contact_and_confirmation`. En una base nueva ya no hace falta
ejecutar el script SQL adicional de cancelaciones. No modificar el checksum de
migraciones ya aplicadas a entornos compartidos.

## Prueba reproducible en una base desechable

```bash
docker run --rm -d --name biodentis-integrity-local-test -e POSTGRES_USER=biodentis_test -e POSTGRES_PASSWORD=LocalTestOnly2026 -e POSTGRES_DB=biodentis_test -p 127.0.0.1:55439:5432 postgres:16
docker exec biodentis-integrity-local-test createdb -U biodentis_test biodentis_test_final
```

Espera a que PostgreSQL esté listo antes de crear la segunda base. Configura
temporalmente **ambas** URLs de conexión de la terminal con:

```text
postgresql://biodentis_test:LocalTestOnly2026@127.0.0.1:55439/biodentis_test_final?schema=public
```

En PowerShell usa `$env:DATABASE_URL='...'` y `$env:DIRECT_URL=$env:DATABASE_URL`;
en bash, `export DATABASE_URL='...'` y `export DIRECT_URL="$DATABASE_URL"`.
Luego ejecuta:

```bash
pnpm --filter web exec prisma migrate deploy
pnpm db:generate
pnpm --filter web test:integrity-local
```

**La prueba integral borra citas y registros asociados de esa base desechable**
antes de cargar sus fixtures. Rechaza cualquier nombre, puerto o host distinto.
No ejecutar con un túnel hacia otra base. Los dos tests heredados de catálogo y
directorio que usan PostgreSQL quedan omitidos por defecto; para incluirlos exige
`RUN_LOCAL_DATABASE_TESTS=1` y la misma conexión desechable.

Para terminar: `docker stop biodentis-integrity-local-test`. Al utilizar `--rm`,
el contenedor se elimina y no conserva estos datos. Elimina las variables
temporales de la terminal o abre una terminal nueva para volver a tu entorno.

## Política de login

- Ya no existe un bloqueo previo por cinco errores de una IP que afecte a todas
  las cuentas de la red. Las credenciales se verifican en servidor.
- Cinco errores de la misma combinación correo/IP generan 429 para las
  credenciales incorrectas; una contraseña correcta puede recuperar la cuenta.
- El control de volumen limita a 100 solicitudes por minuto/IP. Sin IP se usa el
  correo, evitando una bolsa global `unknown`. El proxy de despliegue debe aportar
  una IP fiable; verificar su configuración al promover el cambio.
- Los contadores se incrementan atómicamente en PostgreSQL y las claves son hashes;
  no dependen de memoria por proceso ni de temporizadores.
- La recuperación de contraseña utiliza su propio límite compartido y tokens de
  una hora. No se imprime ni se registra la contraseña.

## Avisos persistentes

La reserva, confirmación o cancelación inserta un trabajo en la misma transacción
de negocio. Después del commit se intenta entregar; un error de transporte deja
el trabajo persistido. El trabajador reclama mensajes con `FOR UPDATE SKIP LOCKED`,
lease de cinco minutos, backoff y hasta diez intentos. Cada trabajo usa una clave
de idempotencia estable al llamar a Resend. No se garantiza exactamente una
entrega fuera de la ventana de idempotencia del proveedor.

Configura `CRON_SECRET` y programa externamente una llamada periódica autenticada
a `GET /api/cron/email-outbox` con `Authorization: Bearer <CRON_SECRET>` (por
ejemplo, cada minuto). Sin secreto el endpoint rechaza solicitudes. Esto requiere
configuración de infraestructura posterior; el código no activa un scheduler en
producción ni usa `setInterval` como garantía.

Consulta pendientes y trabajos agotados con:

```sql
SELECT id, "appointmentId", kind, attempts, "availableAt", "lockedUntil"
FROM email_outbox WHERE "deliveredAt" IS NULL ORDER BY "availableAt";
```

Revisa el transporte antes de reactivar manualmente trabajos con diez intentos.
Los avisos obsoletos, contactos sin correo y destinatarios excluidos por
`EMAIL_MODE=test` se finalizan sin enviar. `deliveredAt` indica procesamiento
terminal por la política, no prueba de lectura por el paciente. No se redirigen
correos a terceros.

La programación y precisión del recordatorio de HU-14, los formatos de exportación,
los respaldos, recuperación, pooling y la durabilidad del despliegue siguen
requiriendo comprobación independiente. No se certifican desde el repositorio.

## Normalización

No se eliminan columnas de contratos existentes en esta entrega. La categoría
compatible se mantiene desde Specialty.name con triggers; el preflight muestra
copias históricas divergentes para revisión. Los identificadores duplicados de la
nota clínica están protegidos por triggers diferidos. La descripción profesional
del dentista se distingue de sus habilitaciones de reserva. Los snapshots son
evidencia histórica. Son desnormalizaciones justificadas y controladas; no una
certificación formal de tercera forma normal.
