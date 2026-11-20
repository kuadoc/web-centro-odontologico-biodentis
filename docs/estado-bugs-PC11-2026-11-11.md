# Estado de bugs — BIODENTIS / PC11

Fecha de revisión: 11/11/2026. Fuente: `C:/DISEÑO Y ARQUIT/FORMATOS PRÁCTICA DE CAMPO - PC11.docx`.

> Actualización posterior: D-13 y el flujo manual aceptado de D-06/D-08 se implementaron
> después de esta auditoría. Ver [corrección de Citas y cuadro de pendientes](correccion-citas-cancelaciones.md).
> Los estados y 242 pruebas de esta página describen la revisión inicial.

Se contrastaron los 14 defectos únicos del Word con el código y las pruebas existentes.
El original no se modificó. Su texto está convertido en `pc11-documento-extraido.md`
y el resumen de defectos en `pc11-bugs-extraidos.md`.

## Resumen

6 corregidos en código, 5 parcialmente resueltos o mitigados, 2 pendientes y 1 por verificar externamente.
«Corregido» acredita la implementación y la evidencia técnica indicada; no sustituye
la aceptación del responsable ni una certificación del entorno desplegado.

## Cuadro de seguimiento

| ID | Caso(s) del Word | Bug | Estado actual | Qué ya se realizó | Qué falta para cerrarlo |
|---|---|---|---|---|---|
| D-01 | CP03 | Login sin bloqueo por intentos fallidos | Parcial | Límites por IP/correo, bloqueo temporal, limpieza tras login correcto y exclusión de errores internos del contador. Las pruebas de login pasan. | Alinear el CP: hoy el umbral es 5, no 7; el bloqueo por cuenta usa 423 y Retry-After, pero las respuestas 429 por IP/correo no incluyen esa cabecera. El estado sigue en memoria por proceso. |
| D-02 | CP07 | No se puede registrar al paciente presencial sin correo/contraseña | Pendiente | El alta administrativa y el DNI funcionan para pacientes con cuenta. | El formulario y CreatePatientSchema siguen exigiendo email y contraseña. Falta el flujo presencial sin credenciales; no es suficiente dejar vacía la UI porque el backend lo rechaza. |
| D-03 | CP12, CP14 | Roles no autorizados podían abrir administración de usuarios | Corregido | La página /users valida sesión y rol en el servidor; API, menú y rutas aplican permisos. Las pruebas de rutas y sesiones pasan. | Repetir los CP manuales en el entorno de entrega y actualizar el Word. |
| D-04 | CP13 | No se actualizaba el estado del usuario y faltaba reactivación | Corregido | Indicador Activo/Inactivo, confirmación, mensajes de éxito/error y acción Activar. Usa PATCH /api/users/[id] con isActive:true; los hooks invalidan los datos. | Confirmar visualmente el ciclo desactivar/activar en la entrega y registrar evidencia. No hace falta crear un endpoint /activate separado para que funcione. |
| D-05 | CP15 | Correo de recuperación no llega por restricción del proveedor | Por verificar externamente | Existe el flujo de generación del token y el registro de fallos del proveedor. | Verificar dominio/remitente y entrega real. No se enviaron correos en esta auditoría. Además, forgot-password no comprueba el booleano false de sendEmail; puede responder con el mensaje genérico aunque falle el envío. No se puede declarar resuelto. |
| D-06 | CP26, CP27 | Desactivación o reducción de horario dejaba citas pendientes sin atender | Parcial / mitigado | Se bloquean bajas de odontólogos con citas pendientes/confirmadas y reducciones de horario que afecten citas; hay avisos, transacciones y auditoría. Las pruebas de conflictos pasan. | No existe la cancelación automática con motivo exigida por la ficha original. Aceptar formalmente la política actual de bloqueo/reasignación o implementar la política de cancelación; no confundir ambas. |
| D-07 | CP28 | Datos institucionales no se reflejaban en el portal y faltaba confirmación | Corregido | La landing consulta ClinicService.getPublic() dinámicamente; contacto y pie usan los datos de la clínica. Configuración muestra mensajes de éxito/error. Las pruebas de clínica pública pasan. | Repetir cambio y visualización en el entorno de entrega. |
| D-08 | CP30 | Excepción de calendario no cancelaba citas afectadas | Parcial / mitigado | La creación de excepciones detecta conflictos de recurso y período y devuelve 409 sin guardar la excepción ni alterar citas. Incluye detalle para coordinar reprogramación. | No cancela automáticamente con motivo como solicita CP30. Resolver la diferencia de política y actualizar requisito/prueba o implementar la cancelación requerida. |
| D-09 | CP32 | Fecha de la cita aparecía un día antes | Corregido | La UI usa formatCalendarDate() para fechas civiles; las pruebas verifican que el día se conserve en Lima, UTC y otras zonas. | Repetir la comprobación visual en la entrega. Si CP32 también exige una pantalla previa para el paciente, revisar esa condición por separado: no queda acreditada por corregir la fecha. |
| D-10 | CP33 | Notas con contenido de menos de 10 caracteres se aceptaban | Corregido | El schema compartido rechaza notas de 1–9 caracteres, recorta espacios y conserva el campo vacío como opcional. El formulario muestra validación y las pruebas pasan. | Actualizar estado y evidencia de CP33 en el Word. |
| D-11 | CP39, CP43 | Selector vacío y ausencia de paciente sin cuenta | Parcial | CP39: el selector consulta pacientes activos con búsqueda/paginación; Recepción tiene acceso al directorio y puede registrar la cita. Las pruebas de reserva por rol pasan. | CP43: sigue faltando el paciente sin cuenta. El modelo mantiene patientId obligatorio y no hay formulario alternativo de invitado. No cerrar D-11 completo solo por arreglar el selector. |
| D-12 | CP45 | Faltaban rango de fechas y búsqueda por paciente/DNI | Corregido funcionalmente | Date Range Picker Desde/Hasta, búsqueda por paciente, odontólogo o DNI, combinación con estado y limpieza/paginación. Las pruebas de filtros pasan; existe automatización de navegador. | Ajustar CP45 a lo autorizado: se implementó buscador único y filtrado en cliente de datos autorizados, no campos independientes ni búsqueda nueva en servidor. Si esos detalles siguen siendo obligatorios, queda esa diferencia por resolver. |
| D-13 | CP46, CP47 | Cancelación sin motivo, confirmación ni validación mínima | Pendiente | Existe la operación básica de cancelación y sus restricciones actuales. | La acción de la bandeja sigue llamando directamente a cancelar. Falta modal, motivo mínimo de 25 caracteres, confirmación, validación backend y persistencia de cancellationReason. |
| D-14 | CP50 | Agenda del odontólogo con filtros/navegación incompletos | Parcial / criterio por corregir | Citas ya permite buscar por paciente/DNI y filtrar por rango; el backend conserva agenda propia. | Falta la navegación de agenda por día/semana/mes y Hoy pedida por la ficha. La exigencia de mostrar PENDING/CANCELLED contradice HU-12 y los permisos actuales: DENTIST ve solo CONFIRMED/COMPLETED. Corregir ese criterio; no ampliar permisos para hacer pasar el CP. |

## Evidencia por defecto

Las rutas siguientes parten de la raíz del repositorio; las líneas corresponden a esta revisión.

- D-01: `apps/web/app/api/auth/login/route.ts:9`, `:28`, `:41`, `:47`; `apps/web/lib/login-attempts.ts`; `apps/web/tests/auth/login.test.cts`.
- D-02: `packages/shared-validators/src/schemas.ts:240`; `apps/web/app/(dashboard)/patients/page-content.tsx`, formulario Nuevo Paciente.
- D-03: `apps/web/app/(dashboard)/users/page.tsx:5`; `apps/web/lib/page-access.ts`; `apps/web/modules/auth/page-session.service.ts`; `apps/web/tests/auth/route-access.test.cts` y `access-session.test.cts`.
- D-04: `apps/web/app/(dashboard)/users/page-content.tsx:213`, `:397`, `:406`; `apps/web/app/api/users/[id]/route.ts`; `packages/shared-validators/src/schemas.ts:352`; `apps/web/hooks/use-queries.ts`, useUpdateUser/useDeleteUser.
- D-05: `apps/web/app/api/auth/forgot-password/route.ts:62`; `apps/web/lib/email/send-email.ts:50`, `:69`; `apps/web/lib/email/send-emails.tsx`.
- D-06: `apps/web/modules/users/user.service.ts:73`; `apps/web/modules/users/user.repository.ts:20`; `apps/web/modules/availability/availability.service.ts:65`; `apps/web/tests/unit/dentist-reassignment.test.cts` y `tests/availability/schedule-changes.test.cts`.
- D-07: `apps/web/app/page.tsx:24`; `apps/web/modules/clinic/clinic.service.ts:11`; `apps/web/app/(dashboard)/config/page-content.tsx:148`; `apps/web/tests/unit/public-clinic.test.cts`.
- D-08: `apps/web/modules/config/exception.service.ts:20`; `apps/web/modules/config/exception.repository.ts:27`; `apps/web/tests/availability/exceptions.test.cts`.
- D-09: `packages/ui/src/lib/utils.ts:25`; `apps/web/app/(dashboard)/appointments/page-content.tsx:444`; `apps/web/tests/unit/date-display.test.cts`.
- D-10: `packages/shared-validators/src/schemas.ts`, RequestAppointmentSchema.notes; `apps/web/app/(dashboard)/appointments/page-content.tsx:101`; `apps/web/tests/unit/appointment-notes.test.cts`.
- D-11: `apps/web/app/(dashboard)/appointments/page-content.tsx:94`, `:248`; `apps/web/modules/patients/patient.scope.ts`; `apps/web/prisma/schema.prisma:160`; `apps/web/tests/integration/reception-booking.test.cts`.
- D-12: `apps/web/lib/appointment-filters.ts`; `packages/ui/src/components/date-range-picker.tsx`; `apps/web/app/(dashboard)/appointments/page-content.tsx:375`, `:383`; `apps/web/tests/unit/appointment-filters.test.cts` y `tests/e2e/appointment-filters.cts`.
- D-13: `apps/web/app/(dashboard)/appointments/page-content.tsx:169`, `:187`; `apps/web/modules/appointments/appointment.service.ts:133`; `apps/web/app/api/appointments/[id]/cancel/route.ts`; modelo Appointment sin cancellationReason.
- D-14: `HU-biodentis.md:129`, `:236`; `packages/shared-validators/src/rules.ts:31`; `apps/web/app/(dashboard)/appointments/page-content.tsx:395`; `apps/web/app/(dashboard)/dashboard/page-content.tsx:321`.

## Pruebas ejecutadas y límites

En esta revisión se ejecutaron 23 archivos existentes de node:test: autenticación,
sesiones, rutas, disponibilidad, pruebas unitarias y cinco suites de integración
con dependencias simuladas. No se modificó código productivo ni se corrigieron bugs.

Resultado observado, código de salida 0:

```text
1..242
# tests 242
# suites 0
# pass 242
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4225.322
```

Se seleccionaron `tests/auth/*.test.cts`, `tests/availability/*.test.cts`,
`tests/unit/*.test.cts` y las integraciones availability-permissions,
exception-permissions, reassignment-permissions, reception-booking y
clinical-note-permissions. Las pruebas pasan para lo que implementa hoy el sistema;
no demuestran que se cumplan las funciones que todavía faltan en el Word.

No se repitieron automatizaciones con escrituras reales, pruebas contra una BD
desplegada ni entregas reales de correo. La automatización de navegador de filtros
existe y tiene ejecución previa documentada en `validacion-bandeja-citas-dni.md`;
su presencia no se presenta como una nueva ejecución en esta auditoría.

El Word atribuye cifras de cobertura a Vitest/v8. No se encontró una configuración
o reporte reproducible de esa cobertura en la inspección actual. No se midió
cobertura porcentual y no se validan sus porcentajes mediante los 242 tests.

## Ajustes necesarios del documento y las pruebas

1. Sincronizar fichas formales, matriz CP y riesgos: el Word mantiene abiertos
   defectos cuyas observaciones ya dicen que fueron corregidos.
2. Mantener D-06 como un defecto compuesto por CP26/CP27 y D-11 por CP39/CP43.
   Sus apariciones repetidas en hallazgos no son nuevos defectos únicos.
3. Conservar H-02 y H-03 como conformidades del original, no como bugs adicionales.
4. Resolver las diferencias de umbral/código/cabeceras de CP03; de bloqueo frente
   a cancelación en CP26/CP27/CP30; y de permisos de DENTIST en CP50.
5. CP32 mezcla en otra sección fecha y confirmación previa; verificar cada condición
   separadamente. El arreglo de fecha no prueba que exista una confirmación para PATIENT.
6. Para CP45, registrar el cambio de alcance solicitado: un buscador combinado y
   filtros locales. No afirmar que se implementaron parámetros patientName/patientDni.
7. Antes de cerrar definitivamente, repetir los CP manuales en el entorno entregado
   y adjuntar evidencias nuevas. Las capturas históricas no prueban el estado actual.

## Orden sugerido para el trabajo pendiente

Primero D-13 (cancelación controlada), después D-02/D-11 (paciente presencial sin
credenciales) y la verificación de entrega de D-05. En paralelo, acordar la política
de D-06/D-08 y corregir CP50 antes de ampliar la agenda. Completar después los
detalles de CP03 y de navegación temporal que permanezcan en alcance.

Esta lista corresponde a los 14 defectos del Word. No constituye una certificación
de ausencia de otros bugs ni una revisión visual independiente de sus 53 imágenes.
