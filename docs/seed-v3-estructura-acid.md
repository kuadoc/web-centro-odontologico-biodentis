# Seed v3 para la estructura ACID de BIODENTIS

**Estado vigente:** por solicitud posterior del propietario, el contenedor y volumen se reconstruyeron y el seed v3 ya se cargó en la base `postgres`. Ver [reporte de reconstrucción](reconstruccion-postgres-seed-v3-2026-11-19.md). Las referencias siguientes a conservar `biodentis` describen la etapa anterior.

## Resultado

Se actualizó el seed de entrada prisma/seed.ts y su implementación prisma/seed-local.ts a la versión 3. Genera datos ficticios válidos para las migraciones actuales; no corrige manualmente las citas y teléfonos de la BD anterior, no borra esa base y no envía correos.

## Requisitos previos

Aplicar en una base local limpia las cuatro migraciones versionadas:

1. 20261111000000_init
2. 20261118000000_integrity_and_delivery
3. 20261118010000_contact_and_confirmation
4. 20261119000000_atomic_patient_codes

El seed comprueba antes de escribir que existan auth_throttles, email_outbox, patient_code_seq, el historial Prisma, al menos 15 CHECK validados, la exclusión de citas, el índice único del DNI y los cuatro triggers activos. Si falta algo, termina con LocalSeedSchemaError sin cargar usuarios.

## Datos incluidos

| Datos | Cantidad / características |
| --- | --- |
| Cuentas | 18: administrador, recepción, tres odontólogos y trece pacientes, incluido uno inactivo |
| Identidad y contacto | DNI de ocho dígitos para pacientes, teléfonos de nueve dígitos y correos ficticios de demostración |
| Códigos de paciente | #PAC-0001 y siguientes, obtenidos de la secuencia atómica; únicos y conservados al repetir |
| Agenda | 27 citas históricas, del día y futuras; sin cruces de odontólogo, sillón o paciente entre fixtures activos |
| Notas clínicas | Seis, vinculadas a las citas atendidas, al paciente y al odontólogo correctos |
| Planes | Tres, con dos sesiones atendidas y una futura del mismo paciente y servicio |
| Catálogo | Tres especialidades y nueve servicios con duración y precio válidos |
| Recursos | Tres sillones y disponibilidad demo de 08:00 a 18:00 los siete días |
| Cancelaciones | Tres solicitudes: pendiente, aprobada y rechazada |
| Excepciones | Tres futuras, sin afectar las citas demo |
| Inventario | Tres artículos con stock no negativo: normal, bajo y cero |
| Correo | Seis plantillas demo; ningún envío ni trabajo pendiente generado |
| Otros | Clúnica ficticia, configuración y auditoría de operaciones demo |

La contraseña demo se toma de SEED_DEMO_PASSWORD. No se imprime ni se incluye en el reporte. Los contactos y documentos son ficticios y no validan existencia de personas o registros oficiales.

## Atomicidad e idempotencia

- El conjunto se guarda en una transacción Serializable: un fallo revierte sus escrituras.
- Se mantienen los UUID históricos del seed v2; el nombre interno del namespace no se cambia para evitar duplicados al actualizar.
- Un paciente demo conserva un código numérico válido que ya tuviera. Los códigos antiguos #PAC-DEMO se sustituyen mediante la secuencia, sin reutilizar números.
- Repetir el seed restaura el estado de sus propios fixtures y sus contraseñas, pero no elimina otros usuarios ni citas.
- Revoca las sesiones y elimina tokens de recuperación de sus cuentas demo.
- Elimina trabajos de correo anteriores únicamente de sus propias citas para evitar avisos obsoletos.
- Los huecos de secuencia por rollback son normales y no representan pérdida de registros.

## Uso en una base limpia

Crear una BD local vacía nueva, por ejemplo biodentis_local_v3, y apuntar DATABASE_URL y DIRECT_URL a esa misma base. Conservar intacta la anterior. Configurar SEED_DEMO_PASSWORD y mantener EMAIL_MODE=test.

Desde la raíz del monorepo:

~~~powershell
pnpm.cmd db:generate
pnpm.cmd --filter web exec prisma migrate deploy
pnpm.cmd db:seed
pnpm.cmd dev
~~~

No ejecutar migrate reset ni db push para evadir el historial. Este seed no elimina datos incompatibles que ya existan en una base anterior; para una instalación limpia debe usarse una base vacía migrada.

## Verificación

Las pruebas unitarias comprueban bloqueo previo de esquemas incompletos, guardas de entorno, contraseña de configuración, fechas civiles de Lima, ausencia de cruces y coherencia de planes.

La prueba PostgreSQL carga el seed, lo repite al día siguiente y lo vuelve a cargar en el día original. Comprueba DNI, teléfonos, códigos únicos y estables, seis plantillas, ausencia de trabajos demo pendientes, notas y restricciones reales. También verifica login, reservas concurrentes, triggers y rollback clínico.

La validación escribe únicamente en biodentis_test_final, PostgreSQL desechable en localhost:55439. No se ejecutó el seed v3 sobre biodentis principal ni se modificó su conexión .env.

Resultado final: seis pruebas unitarias aprobadas y la suite PostgreSQL de integridad aprobada, incluyendo las tres cargas consecutivas del seed. Typecheck y lint del monorepo terminaron sin errores; permanecen 33 advertencias previas. La revisión del diff no encontró errores de espacios.
