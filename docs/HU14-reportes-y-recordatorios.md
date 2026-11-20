# HU-14: reportes y recordatorios

## Alcance implementado

La ruta `/reports/reassignments` ofrece dos secciones a Administración: **Actividad y atenciones** y **Cancelaciones y reasignaciones**. Los pacientes acceden únicamente a su actividad y recordatorios. El servidor obtiene la identidad de la sesión; no admite seleccionar otro paciente desde la petición. Recepción y odontólogos mantienen sus permisos anteriores y no acceden a este reporte administrativo.

La actividad se consulta por día, semana (lunes a domingo), mes, año o intervalo personalizado de hasta 366 días, y por odontólogo. La referencia temporal es `America/Lima`. El intervalo incluye las fechas inicial y final según la fecha civil de la cita.

- Total del período: todas las citas, independientemente del estado.
- Atenciones: citas `COMPLETED` cuya hora de inicio ya ocurrió. No se equipara fecha pasada con atención realizada.
- Programadas: citas futuras `PENDING` o `CONFIRMED` dentro del período.
- Pacientes atendidos: personas distintas de las citas completadas.
- Asistencia: completadas / (completadas + inasistencias). No incluye citas futuras, pendientes ni canceladas.
- Atendidas hasta hoy: acumulado sin fecha inicial, respetando odontólogo y alcance del paciente.
- Rankings: número de citas completadas, con pacientes únicos como dato adicional y criterio de desempate. Un paciente con tres sesiones suma tres atenciones y una persona.
- Especialidad: la del servicio efectivamente registrado; se usa `Treatment.category` como compatibilidad si falta su relación de especialidad. No se infiere desde la descripción profesional del odontólogo.

El gráfico usa días para intervalos cortos, semanas para intervalos intermedios y meses para el año; rellena con cero los períodos sin actividad. El detalle muestra todas las citas o solo las próximas, con 10 filas por página inicialmente y selector de 10, 20, 50 o 100. El pie concentra el selector de filas, las páginas numeradas, primera/última página y el resumen de registros mostrados; no hay paginación entre los filtros y los encabezados de columnas. Cancelaciones y reasignaciones también tienen páginas numeradas y selector de filas. Los indicadores consideran todo el intervalo, no solo la página visible; los cambios de filtro o tamaño reinician la página y el Excel mantiene la exportación completa.

El Excel de actividad incluye resumen, evolución, odontólogos, especialidades, servicios, citas y citas programadas/recordatorios. Administración recibe además la última ejecución del trabajador si existe. Contiene todas las filas filtradas. El Excel previo de cambios conserva cancelaciones y reasignaciones en la segunda sección; sus filtros son independientes. Los rankings reflejan el odontólogo y catálogo actualmente asociados a la cita, ya que no existen snapshots de las atenciones completadas. El historial de cambios conserva sus propios snapshots.

## Recordatorios persistentes

La migración `20261119010000_reports_and_reminders` añade `EmailOutbox.outcome`, habilita los trabajos `REMINDER:fecha:hora` y crea `scheduled_job_runs`. No altera ni elimina citas o historias clínicas.

`GET /api/cron/email-outbox`, con `Authorization: Bearer <CRON_SECRET>`, ejecuta:

1. Registro persistente del inicio.
2. Encolado idempotente de recordatorios de citas confirmadas futuras. El vencimiento se calcula como fecha/hora de Lima menos 24 horas. La fecha/hora forma parte de la clave para admitir reprogramaciones.
3. Procesamiento de hasta 20 correos pendientes, incluyendo avisos previos y recordatorios, con el bloqueo persistente `FOR UPDATE SKIP LOCKED` existente.
4. Revalidación del estado y horario antes de enviar. Se descartan trabajos correspondientes a horarios antiguos, citas canceladas o ya iniciadas.
5. Reintentos con espera creciente y un máximo de 10 intentos; registro del resultado del ciclo.

Estados diferenciados: previsto sin encolar, en cola, plazo alcanzado, reintento, reintentos agotados, suprimido, obsoleto y aceptado por SMTP. Un correo suprimido no se presenta como enviado. Los pacientes sin correo real (`@patients.invalid`) no reciben avisos. En `EMAIL_MODE=test` solo se permite `EMAIL_TEST_RECIPIENT`, sin redirigir correos ajenos.

`deliveredAt` es un campo histórico de finalización de la outbox; para los nuevos registros se debe consultar también `outcome`. `SMTP_ACCEPTED` acredita aceptación del servidor SMTP, **no** entrega final ni lectura. SMTP no ofrece deduplicación garantizada: si el servidor acepta el mensaje y el proceso cae antes de registrar el éxito, un reintento puede duplicarlo. Se conserva una correlación estable mediante `Message-ID`.

## Activación externa y verificación pendiente

La plantilla [vercel-cron.example.json](./vercel-cron.example.json) está lista para integrarse en `apps/web/vercel.json` cuando se confirme el plan y la configuración del despliegue. No está activa por estar en `docs/`. En Vercel Hobby la frecuencia y precisión del cron no sirven para este ciclo frecuente; usar un plan compatible o un programador externo que llame al mismo endpoint autenticado. No ejecutar dos programadores para el mismo despliegue.

Con un ciclo de cinco minutos, la elegibilidad es 24 horas antes y el intento ocurre en el siguiente ciclo, sujeto a retrasos del programador, cola y reintentos. Una cita confirmada con menos de 24 horas se incorpora ya vencida y se intenta en el siguiente ciclo. No se promete precisión al segundo. El indicador de última ejecución muestra evidencia registrada y avisa si pasan más de diez minutos sin un inicio; no acredita que el programador siga activo en el futuro.

Antes de declarar la HU-14 completamente verificada:

1. Aplicar la migración revisada en el entorno autorizado y regenerar el cliente Prisma.
2. Configurar `CRON_SECRET` y SMTP en producción y activar el programador externo.
3. Comprobar un ciclo automático en el despliegue, el registro de ejecución y el vencimiento de un trabajo de prueba.
4. Con un destinatario autorizado, comprobar por separado aceptación SMTP y recepción efectiva. No enviar pruebas a pacientes reales sin autorización.
5. Verificar en navegador los filtros, alcances y descarga de los Excel contra datos del entorno.

Verificación local realizada: migración aplicada en `postgres` de `localhost:5432`; 25 pruebas de reportes/permisos y 11 de correo aprobadas; prueba PostgreSQL de -24 horas, idempotencia, reprogramación, claim y reintento aprobada dentro de una transacción revertida. Comprobación en Chrome de indicadores, filtro anual, Excel real, diseño de escritorio/móvil y aislamiento de paciente aprobada con cuentas temporales eliminadas al terminar. Evidencias locales en `apps/web/tests/e2e/evidencias/reporte-citas-*.png` (excluidas de Git).

Las verificaciones locales no certifican el despliegue ni la recepción de correos. La programación externa y la entrega efectiva siguen pendientes; la plantilla de cron no está activa.

Referencias: [límites de cron de Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) y [configuración de cron](https://vercel.com/docs/cron-jobs).
