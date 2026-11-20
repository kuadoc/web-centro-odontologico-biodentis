# Correcciones ACID y estado de la base de datos — 19/11/2026

**Estado vigente posterior a esta revisión:** el propietario autorizó eliminar el contenedor y el volumen anteriores. Se reconstruyó el mismo contenedor con la base `postgres`, las cuatro migraciones y seed v3. Ver [reporte final](reconstruccion-postgres-seed-v3-2026-11-19.md). Los estados pendientes de `biodentis` que siguen son antecedentes históricos.

## Alcance y estado

Trabajo autorizado sobre el código y la BD local PostgreSQL 16.15, base biodentis en localhost:5432/public. No se intervino Vercel ni Supabase ni se enviaron correos. Se conservaron los cambios locales previos.

**Actualización de alcance: el propietario eligió preparar un seed v3 con datos válidos, en lugar de cancelar o corregir manualmente los registros antiguos. El código y las migraciones fueron verificados en PostgreSQL desechable; biodentis principal permanece intacta y todavía no está migrada. Véase seed-v3-estructura-acid.md.**

## Respaldo y restauración

- Respaldo completo en formato PostgreSQL custom: .backups/biodentis-before-acid-20261119.dump.
- Restaurado correctamente en biodentis_acid_restore_verified_20261119, dentro del contenedor PostgreSQL local. Esta copia permanece intacta.
- Conteos y checksums de filas coinciden con el origen en las 20 tablas; no se imprimieron datos personales ni credenciales.
- .backups/ está excluido de Git. Los archivos de conexión de pruebas también permanecen allí.
- La restauración es una recuperación lógica probada. No certifica resistencia del disco, recuperación tras pérdida del equipo ni recuperación a un instante mediante archivado WAL.

## Reconciliación del historial

Se creó una BD de referencia separada desde 20261111000000_init y se comparó mediante Prisma migrate diff con la base existente. Las diferencias detectadas fueron el antiguo índice único de agenda ausente y el índice adicional por odontólogo/fecha/hora. Las tablas y columnas coinciden con la migración inicial.

El índice parcial appointments_active_slot_key también existe en la BD local; Prisma diff no representa completamente los índices parciales. Su definición fue inspeccionada directamente en PostgreSQL. No basta con confiar únicamente en migrate diff.

El procedimiento local preparado:

1. Exige el respaldo y comprueba primero los datos mediante preflight-integrity.sql.
2. Si hay incidencias, termina con DATA_REVIEW_REQUIRED antes de escribir.
3. Sin incidencias, vuelve a comparar la referencia y rechaza diferencias no revisadas.
4. Recupera el índice original antes de reconocer el baseline inicial.
5. Ejecuta migrate resolve exclusivamente para la migración inicial comprobada; después migrate deploy aplica las migraciones pendientes.
6. Sincroniza las categorías de servicios desde el nombre de la especialidad.

No ejecutar db push, reset ni marcar todas las migraciones como aplicadas para ocultar el desfase.

## Datos pendientes de decisión

- Una cita CONFIRMED del 09/10/2026, 10:00–23:08, cruza con otra PENDING de 21:31–22:00. No se ha cancelado ni reprogramado ninguna.
- Un teléfono contiene un carácter incompatible con la restricción prevista; tiene diez dígitos. No se inventó ni sustituyó un número.
- Cinco servicios tienen category distinta del nombre de su especialidad. La especialidad es la fuente de autoridad; se preparó su sincronización al aplicar.
- Los identificadores operativos se guardaron en .backups/conflicts.json, fuera de Git. No se incluyen datos personales en este informe.

## Cambios en código

### Registro y códigos de paciente

- AuthRepository.withTransaction agrupa creación del usuario y sesión. Si falla la sesión se revierte el usuario.
- Nueva migración 20261119000000_atomic_patient_codes: secuencia PostgreSQL patient_code_seq inicializada por encima del máximo código numérico existente.
- PatientCodeRepository usa nextval, atómico entre conexiones, y omite códigos ya ocupados por importaciones o seeds.
- Se conserva el formato #PAC-0001 y no se truncan códigos de más de cuatro dígitos.
- Los huecos de numeración tras un rollback son deliberados: un código visible no representa una numeración contable sin huecos.
- La generación utiliza el cliente de la transacción cuando corresponde, sin pedir otra conexión al pool.

### Recuperación y sesiones

- La rotación de refresh exige revokedAt=null y expiración vigente al escribir, dentro de la misma transacción que crea el reemplazo. Una segunda solicitud concurrente falla sin crear otra sesión.
- PasswordResetRepository y PasswordResetService separan persistencia y lógica del endpoint HTTP.
- Consumir el token, cambiar la contraseña y revocar sesiones ocurre en una sola transacción.
- El consumo utiliza una actualización condicional de un token no usado y vigente; se exige exactamente una fila afectada.
- Emitir un nuevo enlace agrupa borrado de enlaces anteriores e inserción. Un bloqueo por usuario serializa solicitudes concurrentes.
- Emisión y consumo bloquean primero usuario y después token para mantener un orden de bloqueo consistente.
- El cambio de contraseña desde el perfil también agrupa contraseña y revocación de sesiones en su repositorio.

### Auditoría

- Alta, edición y cambio de estado del paciente guardan el cambio y su auditoría mediante el mismo cliente transaccional.
- Escrituras de especialidades, asignaciones, servicios y cambios de estado del catálogo agrupan modificación y auditoría.
- Los repositorios de catálogo ya ligados a una transacción reutilizan ese contexto; no abren una transacción independiente.

### Agenda y correo

- Se conserva el aislamiento Serializable con hasta tres intentos ante conflictos de agenda.
- Se conserva la outbox persistida y el envío SMTP después del commit.
- No se introdujeron reintentos SMTP en memoria ni envíos de prueba reales.
- SMTP no garantiza entrega exactamente una vez: un envío aceptado cuyo resultado local se pierda puede repetirse.

## Estado comprobado de las bases

| Elemento | biodentis principal | biodentis_test_final desechable |
| --- | --- | --- |
| Tablas | 20 | 23, incluido historial Prisma |
| Restricciones CHECK | 0 | 15 |
| Exclusión de horarios | 0 | 1 |
| Triggers personalizados | 0 | 4 |
| auth_throttles | Falta | Presente |
| email_outbox | Falta | Presente |
| Historial Prisma | Falta | Cuatro migraciones aplicadas |
| patient_code_seq | Falta | Presente |

La copia de ensayo biodentis_acid_review_20261119 tiene el mismo estado estructural migrado que la BD desechable.

Los cuatro triggers protegen correspondencia clínica/cita y sincronización de categorías/especialidades. No se añadieron vistas sin una necesidad de consulta demostrada.

## Evidencia de verificación

- 44 pruebas de autenticación, DNI y formulario pasaron tras la adaptación transaccional.
- La suite PostgreSQL de integridad pasí en biodentis_test_final: restricciones de valores, reservas concurrentes, rollback de atención clínica, triggers, outbox y login real con datos sintéticos.
- La suite adicional ACID verifica rollback del registro si falla la sesión, altas simultáneas con códigos únicos, refresh concurrente de un solo uso, consumo concurrente del reset y rollback de auditoría en pacientes y catálogo.
- También verifica que solicitudes simultáneas dejan un solo enlace de recuperación y que un fallo de creación conserva el anterior.
- Las pruebas escriben únicamente en biodentis_test_final, contenedor separado en localhost:55439. Las pruebas de transporte usan mocks.
- Typecheck y lint del monorepo pasaron (seis tareas). Permanecen advertencias previas de la aplicación; no hay errores. La comprobación del diff no detectó errores de espacios.
- La suite ACID terminó con nueve pruebas aprobadas, incluidos sus ocho subcasos. La suite de catálogo persistente pasí sus dos pruebas.
- La reconciliación completa también se ensayó con éxito en biodentis_acid_review_20261119, copia separada de la restauración intacta. Solo en ese ensayo se simuló cancelar la cita pendiente y limpiar el carácter inválido del teléfono. Se aplicaron las cuatro migraciones y se sincronizaron cinco categorías. Estas correcciones no se ejecutaron en biodentis.

## Interpretación de ACID

- Atomicidad: las unidades de negocio corregidas agrupan todas sus escrituras; las pruebas incluyen fallos deliberados y comprueban rollback real.
- Consistencia: claves foráneas e índices existentes se complementan con CHECK, exclusión y triggers en la BD migrada de pruebas. Faltan todavía en la principal.
- Aislamiento: agenda utiliza Serializable; tokens utilizan consumo condicional y bloqueos de fila. No se elevó todo el sistema a Serializable sin necesidad.
- Durabilidad: en la conexión local se observaron fsync=on, synchronous_commit=on y full_page_writes=on. archive_mode=off; no se cambió la configuración global del servidor.

## Rendimiento e inventario

Se detectaron doce claves foráneas candidatas a revisar por ausencia de un índice no parcial adecuado. No se crean doce índices automáticamente: deben justificarse por consultas, volumen y planes de ejecución representativos. No se certifica rendimiento de producción con el conjunto local pequeño.

El historial de movimientos de inventario no estaba implementado. Agregar entradas, salidas, ajustes, autorización e interfaz constituye una funcionalidad nueva y necesita definir cantidades, motivos y reglas. Este trabajo no inventa esos contratos ni afirma que existan movimientos transaccionales.

## Comandos operativos

Desde apps/web, con el .env local y Docker disponible:

~~~powershell
node --env-file=.env scripts/local-database-maintenance.cjs status
node --env-file=.env scripts/local-database-maintenance.cjs verify-restore
node --env-file=.env scripts/local-database-maintenance.cjs apply
node --env-file=.env scripts/local-database-maintenance.cjs test
node --env-file=.env scripts/local-database-maintenance.cjs test tests/integration/acid-corrections.cts
~~~

El comando apply está protegido por el preflight; no resuelve por su cuenta citas ni teléfonos. El contenedor y las copias de revisión se conservan para trazabilidad; no se borraron respaldos ni bases existentes.
