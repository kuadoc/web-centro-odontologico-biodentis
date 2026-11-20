# BIODENTIS — Historias de usuario

Matriz consolidada. Esta versión reemplaza el contenido duplicado y los fragmentos
interrumpidos del documento anterior. Los criterios son verificables; la existencia
de esta matriz no certifica su cumplimiento en producción.

| HU | Historia | Criterios de aceptación |
| --- | --- | --- |
| HU-01 | Como visitante, consultar servicios odontológicos. | Catálogo público con nombre, descripción, buscador, estado vacío y diseño adaptable. |
| HU-02 | Como Recepción, registrar una cita presencial o telefónica. | Servicio, odontólogo, fecha, horario y contacto del paciente. Puede registrarse el contacto sin email ni contraseña de portal. Estado inicial CONFIRMED. Validación de horarios, excepciones y cruces concurrentes. |
| HU-03 | Como paciente autenticado, reservar una cita online. | Reserva propia; servicio y bloque disponible; motivo, presencia de dolor y tiempo del problema obligatorios. Estado inicial PENDING; Recepción confirma; odontólogo asignado completa. |
| HU-04 | Como Recepción, gestionar citas pendientes. | Listado y filtros de estados/fechas; ver cuestionario; confirmar; rechazar con motivo y aviso persistido para entrega. |
| HU-05 | Como odontólogo asignado, registrar la atención clínica. | Exclusivo del odontólogo activo asignado. Diagnóstico y tratamiento al completar una cita CONFIRMED; nota, cambio a COMPLETED y auditoría en una transacción. Para agregar una nota a una cita ya COMPLETED, comprobar paciente, odontólogo y ausencia de nota. Una nota por cita; historial descendente. |
| HU-06 | Como visitante, registrarme y recuperar mi acceso. | Registro público solo PATIENT; personal creado por ADMIN; email sin distinción de espacios exteriores/mayúsculas en formularios nuevos; contraseña protegida con hash; recuperación con token temporal de una hora. |
| HU-07 | Como usuario, mantener una sesión y permisos por rol. | Access token de 15 minutos, refresh de 7 días; renovación y revocación verificables. Paciente solo sus datos, dentista su ámbito; Recepción sin notas ni historial clínico. Los fallos de otra cuenta no bloquean un login válido en la misma red. Protección compartida contra volumen abusivo y respuestas Retry-After. |
| HU-08 | Como ADMIN, gestionar personal. | Crear, editar y desactivar personal con perfil y horario. Al desactivar un dentista se cancelan sus PENDING con responsable, motivo, auditoría y aviso. Si tiene CONFIRMED, se bloquea hasta gestionarlas; todo dentro de la misma transacción de agenda. |
| HU-09 | Como ADMIN, configurar clínica y excepciones. | Nombre, RUC, dirección y teléfono; excepciones por dentista, clínica o unidad. Una excepción cancela PENDING afectadas con trazabilidad. Si afecta CONFIRMED, se rechaza hasta gestionarlas. La disponibilidad considera las excepciones. |
| HU-10 | Como paciente o personal autorizado, gestionar datos de contacto. | Paciente solo su perfil; Recepción/ADMIN buscan por nombre o DNI con paginación sin acceder a notas clínicas. DNI opcional de 8 dígitos, único cuando existe; teléfono consistente; RUC de 11 dígitos cuando se informa. |
| HU-11 | Como paciente, consultar y gestionar mis citas. | Listado propio. Cancelar o reprogramar citas PENDING/CONFIRMED propias sin atención registrada, solo cuando faltan estrictamente más de 24 horas según America/Lima. A las 24 horas exactas o menos, derivar a Recepción por teléfono o presencialmente. |
| HU-12 | Como dentista o Recepción, consultar agenda. | Dentista ve solo su agenda CONFIRMED/COMPLETED. Recepción ve agenda general y sus estados. Filtros por fechas, odontólogo y estado. |
| HU-13 | Como paciente u odontólogo, consultar historial clínico. | Paciente lee su propio historial; odontólogo consulta pacientes con atenciones propias; Recepción recibe 403. ADMIN conserva la supervisión autorizada del sistema. |
| HU-14 | Como ADMIN/paciente, consultar reportes y recibir recordatorios. | Reportes por período y odontólogo exportables; tarea externa programada para recordatorios 24 horas antes de la cita. Verificar aparte formatos de exportación, programación efectiva y entrega. Los avisos de reserva/confirmación/cancelación cuentan con outbox persistente y reintentos. |

Reglas de conservación: las citas y notas atendidas no se borran para liberar
horarios. Una cancelación libera la reserva conservando su registro. El responsable
de una cancelación mantiene su FK; su cuenta se desactiva en vez de borrarse.

Normalización: Specialty.name es la autoridad de la categoría de un servicio
vinculado. `Treatment.category` se mantiene como copia por compatibilidad y se
sincroniza en BD. `Dentist.specialty` describe la presentación profesional, mientras
la relación `specialties` determina las habilitaciones para reservas. Las referencias
paciente/odontólogo en ClinicalRecord son derivadas y se comprueban contra la cita
al commit. Los snapshots de cancelación son evidencia histórica, no datos actuales.
Estas decisiones son desnormalizaciones documentadas; no equivalen a certificar 3FN.
