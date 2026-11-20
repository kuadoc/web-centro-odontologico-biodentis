# Corrección de Citas: cancelación, revisión y reporte

Fecha: 11/11/2026. Cambio funcional autorizado por el usuario, separado de las refactorizaciones anteriores.

## Objetivo y resultado

Evitar cancelaciones sin autorización. Recepción cancela citas pendientes; para las confirmadas
envía una solicitud a Administración. Ambos motivos y responsables quedan registrados.
No hay cancelaciones automáticas por baja de odontólogo, cambios de horario o excepciones.
Se mantienen los bloqueos existentes hasta resolver las citas afectadas mediante reasignación
o cancelación autorizada.

## Reglas implementadas

| Operación | Responsable | Condición | Resultado |
|---|---|---|---|
| Cancelación directa | Recepción | PENDING, sin registro clínico | CANCELLED y registro en el reporte |
| Solicitar cancelación | Recepción | CONFIRMED, sin registro clínico ni solicitud abierta | REQUESTED; cita sigue CONFIRMED y ocupa el turno |
| Aprobar solicitud | Administración | Solicitud abierta; cita todavía CONFIRMED sin atención registrada | CANCELLED; conserva ambos motivos y responsables |
| Rechazar solicitud | Administración | Solicitud abierta | REJECTED; cita conserva su estado; permite solicitar nuevamente |
| Cancelar COMPLETED, NO_SHOW o CANCELLED | Ninguno | Estado cerrado | Operación bloqueada |
| Cancelar desde paciente u odontólogo | Ninguno de estos roles | Cualquier estado | 403 por API |

Motivos obligatorios: 25–2000 caracteres después de recortar espacios. Los formularios exigen
confirmación explícita. Administración añade un motivo propio y no reemplaza el de Recepción.
El actor procede de la sesión; su cuenta activa y rol se verifican dentro de la transacción.
No se aceptan responsables o roles del navegador ni decisiones duplicadas.

Esta regla interna sustituye el permiso anterior de cancelación del portal y la restricción
general de 24 horas para cancelar. La reprogramación conserva la anticipación de 24 horas:
Recepción, Administración o paciente propietario. El odontólogo no reprograma por esta API.

## Cuadro de correcciones relacionadas

| Parte / defecto | Antes | Cambio aplicado | Resultado |
|---|---|---|---|
| D-13 / CP46–CP47 | Cancelación directa sin motivo validado ni confirmación; API permitía cuatro roles | Modal, motivo mínimo, confirmación y permisos por rol/estado | Corregido y validado localmente |
| Citas confirmadas | Sin solicitud ni decisión administrativa | Solicitud persistente, aprobación/rechazo ADMIN con motivo adicional | Ambos responsables y motivos conservados |
| Reporte | Solo reasignaciones | Solicitudes pendientes, historial, motivos, actores y fechas; actualización cada 30 s | Notificación persistente dentro del reporte |
| Gráficos | Sin métricas de cancelación | Tarjetas, barras de seis meses y distribución de estados con datos de BD | Estilo de `design.md`, escritorio y móvil |
| Concurrencia | Confirmación o atención podía sobrescribir una cancelación | Escrituras condicionadas al estado; revisión serializable con reintentos | Evita reactivación y decisiones duplicadas |
| Turno cancelado | Índice único incluía CANCELLED y bloqueaba otra reserva en ese turno | Índice parcial para citas no canceladas | Libera el turno y conserva el historial |
| Reprogramación | API permitía intentar cambios de citas ajenas o cerradas | Validación de propiedad, rol, estado y registro clínico | Bloquea operaciones indebidas |
| Cambios durante revisión | La cita podía cambiar tras solicitar cancelación | Bloqueo de reprogramación/reasignación con solicitud REQUESTED | Conserva los datos que Administración revisa |
| D-06 / CP26–CP27 | Bloqueo de baja/reducción de horario con citas afectadas | Se conserva el bloqueo y se añade cancelación autorizada | Política manual aceptada; no se exige cancelación automática |
| D-08 / CP30 | Excepción bloqueada por citas afectadas | Se conserva bloqueo hasta resolver las citas | Política manual aceptada; no se exige cancelación automática |

Los correos de cancelación solo se intentan después del commit de una cancelación efectiva,
nunca al solicitarla. Un fallo de correo no revierte la cancelación. No se verificó entrega real.
La notificación dentro del reporte se obtiene de la BD; no depende de memoria ni del correo.

## Mapeo de archivos

| Capa | Archivos principales |
|---|---|
| Modelo/migración | `apps/web/prisma/schema.prisma`, `appointment-cancellation-upgrade.sql` |
| Validadores | `packages/shared-validators/src/schemas.ts`, `index.ts` |
| Reglas y BD | `apps/web/modules/appointments/cancellation.service.ts`, `cancellation.repository.ts` |
| Operaciones relacionadas | `appointment.service.ts`, `appointment.repository.ts`, `reassignment.service.ts`, `reassignment.repository.ts`, `schedule-transaction.repository.ts` |
| API | PATCH `/api/appointments/[id]/cancel`; POST `/api/appointments/[id]/cancellation-requests`; PATCH `/api/appointment-cancellations/[id]/review`; GET `/api/reports/cancellations` |
| Formularios | `apps/web/components/appointments/appointment-cancellation-dialog.tsx`, `apps/web/app/(dashboard)/appointments/page-content.tsx` |
| Reporte | `apps/web/components/appointments/cancellation-report.tsx`, `apps/web/app/(dashboard)/reports/reassignments/report-content.tsx` |
| Aviso tras cancelación | `apps/web/modules/appointments/appointment-notification.service.ts` |

## Migración y entorno

Migración aplicada correctamente a PostgreSQL local en Docker (`next-monorepo-postgres-1`),
que contiene las 34 citas existentes. Crea `appointment_cancellations`, enum, relaciones,
campos de cancelación e índices. No altera estados de citas existentes.

El índice parcial `appointments_active_slot_key` se administra mediante SQL porque Prisma 6
no representa su condición en el modelo. Aplicar esta migración al crear otro entorno;
`db:push` por sí solo no acredita esta protección. Se ajustó el seed a la nueva clave;
no se ejecutó el seed ni se reinicializó la BD.

`.env` apunta a Supabase. Su conexión de sesión respondió P1014: no existe `appointments`.
La transacción fallida se revirtió; **Supabase no queda migrado**. La validación local usó
`DATABASE_URL` temporal en el proceso, sin modificar `.env` ni imprimir credenciales.
`http://localhost:3000` quedó usando la BD local. Al reiniciar hay que seleccionar nuevamente
esa conexión: ejecutar `pnpm dev` sin ella vuelve al Supabase configurado.

Con la conexión correcta seleccionada y las tablas del proyecto existentes:

```powershell
pnpm.cmd --filter web db:appointment-cancellations
```

## Verificación realizada

- 307 pruebas aprobadas de regresión: autenticación, disponibilidad, citas y permisos.
  Incluyen 58 nuevas de cancelación y siete de reprogramación.
- Una prueba adicional con PostgreSQL real local, aprobada: solicitudes/aprobaciones
  simultáneas, una única decisión y auditoría, ambos motivos, rechazo, reutilización del
  turno, bloqueo de reprogramación y rollback si falla la auditoría.
- Chrome aprobado: Recepción solicita la confirmada y cancela la pendiente, con motivo
  y confirmación; Administración ve la solicitud, gráficos y motivos, y aprueba con motivo
  adicional. Sin desborde horizontal a 375/320 px. Login con cuentas temporales reales;
  las citas de la prueba visual son fixtures interceptados. Cuentas y datos de BD temporales
  eliminados al finalizar.
- `pnpm.cmd typecheck`: código 0, cuatro tareas correctas. `pnpm.cmd lint`: código 0,
  cero errores y las mismas 33 advertencias previas. No se midió cobertura porcentual
  ni se validó despliegue remoto.

Desde `apps/web`:

```powershell
pnpm.cmd test:cancellations
# Requieren DATABASE_URL local; la visual también requiere servidor y Chrome:
node --require tsx/cjs --test tests/integration/cancellation-database.cts
node --require tsx/cjs tests/e2e/appointment-cancellations.cts
```

## Cómo validarlo visualmente

1. Recepción → Citas → Ver → Cancelar cita en una pendiente. Escribir motivo, confirmar
   y guardar: pasa a Cancelada.
2. En una confirmada, Ver → Solicitar cancelación: permanece Confirmada. Repetir debe
   informar que ya existe una solicitud pendiente.
3. ADMIN → Reporte de citas (`/reports/reassignments`): revisar contador, paciente,
   solicitante y motivo. Revisar solicitud, añadir motivo y confirmar la decisión.
4. Aprobar cancela; rechazar conserva la cita. Filtrar Canceladas, Rechazadas o Todo el
   historial para comprobar quién actuó y ambos motivos.

## Pendientes independientes o fuera de esta corrección

| ID / parte | Estado | Qué falta |
|---|---|---|
| D-01: login | Parcial | Alinear umbral, respuesta 429 y Retry-After; estado compartido entre instancias en lugar de memoria |
| D-02: paciente sin correo/contraseña | Pendiente | Registro administrativo sin cuenta de acceso; el modelo actual los exige |
| D-05: recuperación por correo | Por verificar | Remitente/dominio y entrega real; comprobar el booleano de envío fallido |
| D-11 / CP43: cita sin cuenta | Pendiente; depende de D-02 | Integrar registro sin cuenta en reserva; CP39 del selector ya estaba corregido |
| D-14: agenda día/semana/mes y Hoy | Parcial | Navegación y ajuste del criterio del Word que contradice HU-12 sobre estados visibles |
| Entorno Supabase | Pendiente | Identificar/provisionar BD y schema correctos antes de migrar y desplegar allí |

Los demás defectos conservan el estado de la auditoría original. Esta corrección no acredita
funcionalidades independientes solo porque pasen sus pruebas existentes. El Word no se editó.
