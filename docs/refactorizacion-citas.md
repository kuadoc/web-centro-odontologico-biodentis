# RF-CITAS-01 — Creación de citas

## Estado y objetivo

**Primer paso realizado: refactorización de `AppointmentService.create()`.**

Se extrajeron tres métodos privados del servicio existente. Las mismas 51 pruebas
pasan antes y después: 24 nuevas de caracterización de creación y 27 existentes
de citas. Esto acredita los escenarios ejecutados, no todo el módulo ni el
comportamiento de una base de datos real.

Se conserva el formato de los documentos de
[disponibilidad](refactorizacion-disponibilidad.md) y
[autenticación](refactorizacion-autenticacion.md): mapeo para capturas, código
completo anterior y posterior, explicación y resultados de pruebas.

Objetivo: hacer explícitas las etapas de creación —validar actor, resolver horario,
comprobar conflictos, guardar y notificar— conservando su orden, resultados y errores.

## Alcance y archivos

| Archivo | Cambio realizado |
|---|---|
| [appointment.service.ts](../apps/web/modules/appointments/appointment.service.ts) | Extracción de tres métodos privados utilizados solo por `create()`; tipo de entrada derivado del schema existente |
| [appointment-create.test.cts](../apps/web/tests/unit/appointment-create.test.cts) | 24 pruebas nuevas ejecutadas antes de cambiar el servicio y repetidas sin modificaciones después |
| [package.json](../apps/web/package.json) | Incorporación de la nueva suite al comando existente `test:appointments` |
| Este documento | Versiones completas, mapeo y evidencia |

`AppointmentRepository` ya existía: el servicio sigue delegando la persistencia
en él. No se creó otro repository ni se cambió su implementación.

Este paso abarca únicamente `create()` y sus tres métodos extraídos. Se conservaron
`getAll()`, `getById()`, `confirm()`, `cancel()`, `reschedule()`, `updateStatus()`
y `completeWithClinicalNote()`. Las otras propuestas de refactorización de Citas
quedan pendientes de un paso posterior.

La ruta HTTP, los schemas, los repositorios, las transacciones, la auditoría y el
servicio de notificaciones mantienen su comportamiento. El trabajo parte de los
cambios existentes del directorio de trabajo; el diff contra HEAD incluye trabajo
anterior y no representa exclusivamente esta extracción.

## Mapeo para capturas

Archivo: `apps/web/modules/appointments/appointment.service.ts`.
Las líneas del antes corresponden a la versión capturada abajo; las del después,
al archivo final de este paso.

| Parte | Antes | Después |
|---|---|---|
| Tipo derivado del schema | Sin alias local | Import de tipo en 18; alias en 20 |
| Coordinación de creación | `create()`, 58–103 | `create()`, 61–80 |
| Reglas por rol y responsable | Dentro de `create()`, 60–63 | `validateBookingActor()`, 82–88 |
| Tratamiento y selección del bloque | Dentro de `create()`, 64–73 | `resolveBookingEndTime()`, 90–103 |
| Rango y búsqueda de conflictos | Dentro de `create()`, 75–89 | `requireBookingTimeAvailable()`, 105–120 |
| Guardado y notificación | Dentro de `create()`, 91–102 | Dentro de `create()`, 67–79 |

**Captura principal del antes:** líneas **58–103**.
**Capturas del después:** líneas **61–80** para la coordinación y **82–120**
para los métodos privados. Si hace falta, dividir los privados en 82–103 y 105–120.

## Referencia reproducible

- Inicio de registro: `2026-11-06T18:37:50-05:00`, zona `America/Lima`.
- Registro posterior: `2026-11-06T18:40:48-05:00`.
- Entorno: Windows; Node.js `v22.20.0`.
- Fuente anterior: archivo real del directorio de trabajo, conservado antes de editarlo.
- SHA-256 de los bytes originales del servicio antes:
  `B3CDB7435F36E7E5F10136C69B3EC1CD9F92BDD9DAB37AA8AC54288B068C0590`.
- SHA-256 de los bytes del servicio después:
  `A9C64B36824458B92044B9D8FA1F41AA49DD573F676DD18B938B5E59638EF125`.
- SHA-256 de la nueva suite antes y después:
  `E0700FA1D35F89B7D20AEBD0309B68623CE3C55F77EAFC890F66B6F63FBFB11D`.

Los bloques siguientes incluyen todo el archivo, incluidos los métodos sin cambios.
En el Markdown se normalizan los saltos a LF; los hashes anteriores identifican
los bytes de los archivos en disco, por lo que convertir CRLF a LF puede cambiar
el hash. Se verificó por separado que el contenido completo de cada bloque coincide
con su referencia después de normalizar los saltos de línea.

## Antes de refactorizar — archivo completo

`apps/web/modules/appointments/appointment.service.ts`:

```ts
import { AppointmentRepository } from "./appointment.repository";
import { AppointmentNotificationService } from "./appointment-notification.service";
import { AvailabilityService } from "@/modules/availability/availability.service";
import {
  RequestAppointmentSchema,
  RescheduleAppointmentSchema,
  AppointmentStatusUpdateSchema,
  CompleteAppointmentSchema,
  canCancelOrReschedule,
  isValidTimeRange,
  isValidTransition,
  DENTIST_VISIBLE_STATUSES,
} from "@biodentis/shared-validators";
import { AppointmentStatus, Role } from "@biodentis/shared-types";
import { AuditService } from "@/modules/audit/audit.service";
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service";
import { ValidationError, DomainError, ScheduleConflictError, NotFoundError, AuthorizationError } from "@/lib/errors";

const appointmentRepository = new AppointmentRepository();
const availabilityService = new AvailabilityService();

export class AppointmentService {
  /** HU-12: si el solicitante es DENTIST solo se devuelven citas CONFIRMED/COMPLETED. */
  async getAll(
    filters: { patientId?: string; dentistId?: string; status?: string; from?: string; to?: string },
    viewerRole?: Role,
  ) {
    let statuses: AppointmentStatus[] | undefined;
    if (viewerRole === Role.DENTIST) {
      const requested = filters.status as AppointmentStatus | undefined;
      statuses = requested
        ? DENTIST_VISIBLE_STATUSES.filter((s) => s === requested)
        : DENTIST_VISIBLE_STATUSES;
      if (statuses.length === 0) return [];
    } else if (filters.status) {
      statuses = [filters.status as AppointmentStatus];
    }

    return appointmentRepository.findMany({
      patientId: filters.patientId,
      dentistId: filters.dentistId,
      statuses,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }

  async getById(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    return appointment;
  }

  /**
   * HU-03: un PATIENT solo puede reservar un bloque libre calculado de la agenda del
   * dentista (sin excepciones ni citas); la hora de fin se toma del bloque, no del cliente.
   */
  async create(data: unknown, patientId: string, actorRole?: Role, actorId?: string) {
    const parsed = RequestAppointmentSchema.parse(data);
    const bookingForPatient = actorRole === Role.RECEPTIONIST || actorRole === Role.ADMIN;
    if (bookingForPatient && !parsed.patientId) throw new ValidationError("Selecciona el paciente para quien se registrará la cita.");
    if (actorRole === Role.RECEPTIONIST && !actorId) throw new AuthorizationError("No se pudo identificar al responsable de la confirmación.");
    if ((actorRole === Role.PATIENT || actorRole === Role.RECEPTIONIST) && !parsed.treatmentId) throw new ValidationError("Selecciona el servicio que deseas reservar.");
    if (parsed.treatmentId) await new CatalogAdminService().requireBookable(parsed.treatmentId, parsed.dentistId);

    if (actorRole === Role.PATIENT || parsed.treatmentId) {
      const slots = await availabilityService.getAvailableSlots(parsed.dentistId, parsed.date, parsed.treatmentId);
      const slot = slots.find((s) => s.startTime === parsed.startTime);
      if (!slot) {
        throw new ScheduleConflictError("El horario seleccionado ya no esta disponible");
      }
      parsed.endTime = slot.endTime;
    }

    if (!isValidTimeRange(parsed.startTime, parsed.endTime)) {
      throw new ValidationError("Rango de horario inválido");
    }

    const conflict = await appointmentRepository.findConflicting(
      parsed.dentistId,
      new Date(parsed.date),
      parsed.startTime,
      undefined,
      parsed.endTime,
    );
    if (conflict) {
      throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
    }

    const appointment = await appointmentRepository.create({
      patientId: bookingForPatient ? parsed.patientId! : patientId,
      dentistId: parsed.dentistId,
      date: new Date(parsed.date),
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      notes: parsed.notes,
      treatmentId: parsed.treatmentId,
      // Las reservas gestionadas por Recepción ya fueron revisadas y confirmadas.
      status: actorRole === Role.RECEPTIONIST ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING,
    }, actorRole === Role.RECEPTIONIST ? actorId : undefined);
    await new AppointmentNotificationService().sendBookingNotice(appointment.id);
    return appointment;
  }

  async confirm(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!isValidTransition(appointment.status as AppointmentStatus, AppointmentStatus.CONFIRMED)) {
      throw new DomainError(`No se puede confirmar una cita en estado ${appointment.status}`);
    }

    return appointmentRepository.updateStatus(id, AppointmentStatus.CONFIRMED);
  }

  async cancel(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError("No se puede cancelar una cita con menos de 24 horas de anticipación");
    }

    if (!isValidTransition(appointment.status as AppointmentStatus, AppointmentStatus.CANCELLED)) {
      throw new DomainError(`No se puede cancelar una cita en estado ${appointment.status}`);
    }

    return appointmentRepository.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  async reschedule(id: string, data: unknown) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError("No se puede reprogramar una cita con menos de 24 horas de anticipación");
    }

    const parsed = RescheduleAppointmentSchema.parse(data);

    if (!isValidTimeRange(parsed.startTime, parsed.endTime)) {
      throw new ValidationError("Rango de horario inválido");
    }

    const conflict = await appointmentRepository.findConflicting(
      appointment.dentistId,
      new Date(parsed.date),
      parsed.startTime,
      id,
      parsed.endTime,
    );
    if (conflict) {
      throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
    }

    return appointmentRepository.reschedule(id, new Date(parsed.date), parsed.startTime, parsed.endTime);
  }

  /**
   * HU-12: un DENTIST solo opera sobre citas propias ya CONFIRMED y unicamente
   * puede marcarlas como COMPLETED. Confirmar/cancelar/no-show es de Recepcion.
   */
  async updateStatus(id: string, data: unknown, actor?: { role: Role; dentistId?: string }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    const parsed = AppointmentStatusUpdateSchema.parse(data);

    if (actor?.role === Role.DENTIST) {
      if (!actor.dentistId || appointment.dentistId !== actor.dentistId) {
        throw new AuthorizationError("Esta cita no pertenece a tu agenda");
      }
      if (!DENTIST_VISIBLE_STATUSES.includes(appointment.status as AppointmentStatus)) {
        throw new AuthorizationError("Esta cita aun no esta confirmada por Recepcion");
      }
      if (parsed.status !== AppointmentStatus.COMPLETED) {
        throw new AuthorizationError("El odontologo solo puede marcar la cita como atendida");
      }
    }

    if (!isValidTransition(appointment.status as AppointmentStatus, parsed.status as AppointmentStatus)) {
      throw new DomainError(`Transición inválida: ${appointment.status} -> ${parsed.status}`);
    }

    return appointmentRepository.updateStatus(id, parsed.status as AppointmentStatus);
  }

  /** Recepción o el odontólogo a cargo registran la nota y completan una cita confirmada. */
  async completeWithClinicalNote(id: string, data: unknown, actor: { role: Role; userId: string; dentistId?: string }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (actor.role !== Role.RECEPTIONIST && actor.role !== Role.DENTIST) {
      throw new AuthorizationError("No tienes permiso para registrar notas clínicas");
    }
    if (actor.role === Role.DENTIST && (!actor.dentistId || appointment.dentistId !== actor.dentistId)) {
      throw new AuthorizationError("Esta cita no pertenece a tu agenda");
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new DomainError("Solo se puede completar una cita confirmada");
    }
    if (appointment.clinicalRecord) throw new DomainError("La cita ya tiene una nota clínica");

    const { diagnosis, treatment, nextControl } = CompleteAppointmentSchema.parse(data);
    const controls = { none: "Sin control indicado", "1m": "En 1 mes", "3m": "En 3 meses", "6m": "En 6 meses" };
    const notes = `Diagnóstico: ${diagnosis}\nTratamiento: ${treatment}${nextControl ? `\nPróximo control: ${controls[nextControl]}` : ""}`;
    const completed = await appointmentRepository.completeWithRecord(id, appointment.patientId, appointment.dentistId, notes);
    await new AuditService().log(actor.userId, "CREATE_CLINICAL_RECORD", "Appointment", id, `Registro clínico y cita completada por ${actor.role}`);
    return completed;
  }
}
```

## Después de refactorizar — archivo completo

`apps/web/modules/appointments/appointment.service.ts`:

```ts
import { AppointmentRepository } from "./appointment.repository";
import { AppointmentNotificationService } from "./appointment-notification.service";
import { AvailabilityService } from "@/modules/availability/availability.service";
import {
  RequestAppointmentSchema,
  RescheduleAppointmentSchema,
  AppointmentStatusUpdateSchema,
  CompleteAppointmentSchema,
  canCancelOrReschedule,
  isValidTimeRange,
  isValidTransition,
  DENTIST_VISIBLE_STATUSES,
} from "@biodentis/shared-validators";
import { AppointmentStatus, Role } from "@biodentis/shared-types";
import { AuditService } from "@/modules/audit/audit.service";
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service";
import { ValidationError, DomainError, ScheduleConflictError, NotFoundError, AuthorizationError } from "@/lib/errors";
import type { z } from "zod";

type RequestAppointmentInput = z.infer<typeof RequestAppointmentSchema>;

const appointmentRepository = new AppointmentRepository();
const availabilityService = new AvailabilityService();

export class AppointmentService {
  /** HU-12: si el solicitante es DENTIST solo se devuelven citas CONFIRMED/COMPLETED. */
  async getAll(
    filters: { patientId?: string; dentistId?: string; status?: string; from?: string; to?: string },
    viewerRole?: Role,
  ) {
    let statuses: AppointmentStatus[] | undefined;
    if (viewerRole === Role.DENTIST) {
      const requested = filters.status as AppointmentStatus | undefined;
      statuses = requested
        ? DENTIST_VISIBLE_STATUSES.filter((s) => s === requested)
        : DENTIST_VISIBLE_STATUSES;
      if (statuses.length === 0) return [];
    } else if (filters.status) {
      statuses = [filters.status as AppointmentStatus];
    }

    return appointmentRepository.findMany({
      patientId: filters.patientId,
      dentistId: filters.dentistId,
      statuses,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }

  async getById(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    return appointment;
  }

  /**
   * HU-03: un PATIENT solo puede reservar un bloque libre calculado de la agenda del
   * dentista (sin excepciones ni citas); la hora de fin se toma del bloque, no del cliente.
   */
  async create(data: unknown, patientId: string, actorRole?: Role, actorId?: string) {
    const parsed = RequestAppointmentSchema.parse(data);
    const bookingForPatient = this.validateBookingActor(parsed, actorRole, actorId);
    parsed.endTime = await this.resolveBookingEndTime(parsed, actorRole);
    await this.requireBookingTimeAvailable(parsed);

    const appointment = await appointmentRepository.create({
      patientId: bookingForPatient ? parsed.patientId! : patientId,
      dentistId: parsed.dentistId,
      date: new Date(parsed.date),
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      notes: parsed.notes,
      treatmentId: parsed.treatmentId,
      // Las reservas gestionadas por Recepción ya fueron revisadas y confirmadas.
      status: actorRole === Role.RECEPTIONIST ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING,
    }, actorRole === Role.RECEPTIONIST ? actorId : undefined);
    await new AppointmentNotificationService().sendBookingNotice(appointment.id);
    return appointment;
  }

  private validateBookingActor(parsed: RequestAppointmentInput, actorRole?: Role, actorId?: string): boolean {
    const bookingForPatient = actorRole === Role.RECEPTIONIST || actorRole === Role.ADMIN;
    if (bookingForPatient && !parsed.patientId) throw new ValidationError("Selecciona el paciente para quien se registrará la cita.");
    if (actorRole === Role.RECEPTIONIST && !actorId) throw new AuthorizationError("No se pudo identificar al responsable de la confirmación.");
    if ((actorRole === Role.PATIENT || actorRole === Role.RECEPTIONIST) && !parsed.treatmentId) throw new ValidationError("Selecciona el servicio que deseas reservar.");
    return bookingForPatient;
  }

  private async resolveBookingEndTime(parsed: RequestAppointmentInput, actorRole?: Role): Promise<string> {
    if (parsed.treatmentId) await new CatalogAdminService().requireBookable(parsed.treatmentId, parsed.dentistId);

    if (actorRole === Role.PATIENT || parsed.treatmentId) {
      const slots = await availabilityService.getAvailableSlots(parsed.dentistId, parsed.date, parsed.treatmentId);
      const slot = slots.find((s) => s.startTime === parsed.startTime);
      if (!slot) {
        throw new ScheduleConflictError("El horario seleccionado ya no esta disponible");
      }
      return slot.endTime;
    }

    return parsed.endTime;
  }

  private async requireBookingTimeAvailable(parsed: RequestAppointmentInput): Promise<void> {
    if (!isValidTimeRange(parsed.startTime, parsed.endTime)) {
      throw new ValidationError("Rango de horario inválido");
    }

    const conflict = await appointmentRepository.findConflicting(
      parsed.dentistId,
      new Date(parsed.date),
      parsed.startTime,
      undefined,
      parsed.endTime,
    );
    if (conflict) {
      throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
    }
  }

  async confirm(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!isValidTransition(appointment.status as AppointmentStatus, AppointmentStatus.CONFIRMED)) {
      throw new DomainError(`No se puede confirmar una cita en estado ${appointment.status}`);
    }

    return appointmentRepository.updateStatus(id, AppointmentStatus.CONFIRMED);
  }

  async cancel(id: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError("No se puede cancelar una cita con menos de 24 horas de anticipación");
    }

    if (!isValidTransition(appointment.status as AppointmentStatus, AppointmentStatus.CANCELLED)) {
      throw new DomainError(`No se puede cancelar una cita en estado ${appointment.status}`);
    }

    return appointmentRepository.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  async reschedule(id: string, data: unknown) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError("No se puede reprogramar una cita con menos de 24 horas de anticipación");
    }

    const parsed = RescheduleAppointmentSchema.parse(data);

    if (!isValidTimeRange(parsed.startTime, parsed.endTime)) {
      throw new ValidationError("Rango de horario inválido");
    }

    const conflict = await appointmentRepository.findConflicting(
      appointment.dentistId,
      new Date(parsed.date),
      parsed.startTime,
      id,
      parsed.endTime,
    );
    if (conflict) {
      throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
    }

    return appointmentRepository.reschedule(id, new Date(parsed.date), parsed.startTime, parsed.endTime);
  }

  /**
   * HU-12: un DENTIST solo opera sobre citas propias ya CONFIRMED y unicamente
   * puede marcarlas como COMPLETED. Confirmar/cancelar/no-show es de Recepcion.
   */
  async updateStatus(id: string, data: unknown, actor?: { role: Role; dentistId?: string }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    const parsed = AppointmentStatusUpdateSchema.parse(data);

    if (actor?.role === Role.DENTIST) {
      if (!actor.dentistId || appointment.dentistId !== actor.dentistId) {
        throw new AuthorizationError("Esta cita no pertenece a tu agenda");
      }
      if (!DENTIST_VISIBLE_STATUSES.includes(appointment.status as AppointmentStatus)) {
        throw new AuthorizationError("Esta cita aun no esta confirmada por Recepcion");
      }
      if (parsed.status !== AppointmentStatus.COMPLETED) {
        throw new AuthorizationError("El odontologo solo puede marcar la cita como atendida");
      }
    }

    if (!isValidTransition(appointment.status as AppointmentStatus, parsed.status as AppointmentStatus)) {
      throw new DomainError(`Transición inválida: ${appointment.status} -> ${parsed.status}`);
    }

    return appointmentRepository.updateStatus(id, parsed.status as AppointmentStatus);
  }

  /** Recepción o el odontólogo a cargo registran la nota y completan una cita confirmada. */
  async completeWithClinicalNote(id: string, data: unknown, actor: { role: Role; userId: string; dentistId?: string }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (actor.role !== Role.RECEPTIONIST && actor.role !== Role.DENTIST) {
      throw new AuthorizationError("No tienes permiso para registrar notas clínicas");
    }
    if (actor.role === Role.DENTIST && (!actor.dentistId || appointment.dentistId !== actor.dentistId)) {
      throw new AuthorizationError("Esta cita no pertenece a tu agenda");
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new DomainError("Solo se puede completar una cita confirmada");
    }
    if (appointment.clinicalRecord) throw new DomainError("La cita ya tiene una nota clínica");

    const { diagnosis, treatment, nextControl } = CompleteAppointmentSchema.parse(data);
    const controls = { none: "Sin control indicado", "1m": "En 1 mes", "3m": "En 3 meses", "6m": "En 6 meses" };
    const notes = `Diagnóstico: ${diagnosis}\nTratamiento: ${treatment}${nextControl ? `\nPróximo control: ${controls[nextControl]}` : ""}`;
    const completed = await appointmentRepository.completeWithRecord(id, appointment.patientId, appointment.dentistId, notes);
    await new AuditService().log(actor.userId, "CREATE_CLINICAL_RECORD", "Appointment", id, `Registro clínico y cita completada por ${actor.role}`);
    return completed;
  }
}
```

## Qué cambió

1. **`validateBookingActor()`:** reúne las comprobaciones de paciente seleccionado,
   responsable de recepción y tratamiento obligatorio. Devuelve si se reserva para
   un paciente seleccionado. Mantiene el orden y los mensajes de los errores.
2. **`resolveBookingEndTime()`:** comprueba el tratamiento cuando existe, consulta
   disponibilidad cuando corresponde y obtiene la hora final del bloque con el
   inicio solicitado. En la rama que antes permitía horario directo, devuelve
   la hora final del dato validado.
3. **`requireBookingTimeAvailable()`:** comprueba el rango y consulta cruces con
   los mismos argumentos, incluida la hora final resuelta y `excludeId: undefined`
   como cuarto argumento posicional.
4. **`create()`:** conserva Zod al inicio, coordina los métodos anteriores y mantiene
   el guardado y la notificación al final.
5. **Tipado:** `RequestAppointmentInput` se deriva mediante
   `z.infer<typeof RequestAppointmentSchema>`. No se duplica el schema ni se
   introduce una interfaz manual de los datos.

## Comportamiento conservado

- Paciente: reserva para su propia identidad y requiere tratamiento.
- Recepción: requiere paciente seleccionado, responsable y tratamiento; crea
  la cita en estado `CONFIRMED` y pasa el responsable al repository.
- Administración: reserva para el paciente seleccionado y conserva el estado
  `PENDING` del código anterior.
- El estado enviado en el body no reemplaza al decidido por el servidor.
- Con tratamiento, la hora final sale de disponibilidad; se conserva la primera
  coincidencia por hora de inicio mediante `find()`.
- La normalización de notas sigue a cargo del schema compartido.
- Se conservan las ramas de llamadas internas sin rol, sin convertirlas en una
  nueva política de permisos. La autorización HTTP sigue en la ruta existente.
- Las consultas ocurren antes de guardar; solo después de guardar se solicita
  la notificación. No se añade un reintento de creación.
- Si la notificación devuelve `false`, se devuelve la cita guardada. Si una
  dependencia lanza un error, se propaga como antes.
- El objeto recibido del cliente no se modifica: se trabaja con el resultado de Zod.
- Las comprobaciones transaccionales del repository permanecen intactas.

## Casos y trazabilidad

La nueva suite usa `node:test` y simula catálogo, disponibilidad, repository y
notificaciones. Los identificadores agrupan variantes que suman 24 pruebas.

| Caso | Variantes | Escenario y resultado comprobado | Antes | Después |
|---|---:|---|---|---|
| CITA-01 | 4 | PATIENT, RECEPTIONIST, ADMIN y llamada sin rol con tratamiento: paciente, estado, hora final, argumentos y orden de efectos | Aprobado | Aprobado |
| CITA-02 | 2 | ADMIN y llamada sin rol sin tratamiento: conserva horario directo y omite catálogo y disponibilidad | Aprobado | Aprobado |
| CITA-03 | 5 | Reglas de paciente, responsable y tratamiento; prioridad del error cuando falta más de un dato | Aprobado | Aprobado |
| CITA-04 | 2 | ID inválido o nota corta: Zod rechaza antes de las consultas | Aprobado | Aprobado |
| CITA-05 | 1 | Tratamiento no reservable: propaga el error antes de consultar agenda | Aprobado | Aprobado |
| CITA-06 | 1 | Falta bloque con el inicio solicitado: conflicto sin escritura | Aprobado | Aprobado |
| CITA-07 | 1 | La hora final de disponibilidad sustituye a la del cliente antes de validar el rango | Aprobado | Aprobado |
| CITA-08 | 1 | Horario directo inválido: rechaza sin consultar cruces | Aprobado | Aprobado |
| CITA-09 | 1 | Cruce detectado: conserva error y no guarda ni notifica | Aprobado | Aprobado |
| CITA-10 | 4 | Fallo de disponibilidad, consulta de cruce, guardado o notificación: propagación y detención de efectos posteriores | Aprobado | Aprobado |
| CITA-11 | 1 | Notificación devuelve false: conserva la cita y no repite el guardado | Aprobado | Aprobado |
| CITA-12 | 1 | Resolución del horario no modifica el objeto del cliente | Aprobado | Aprobado |

Se ejecutaron también las seis suites existentes sobre concurrencia simulada,
notas, notificaciones, reserva transaccional, reserva HTTP por rol y permisos de
nota clínica. Sus 27 pruebas pasan en ambas versiones. Los nombres de las suites
no implican por sí solos una conexión a una BD real.

## Ejecución anterior al refactor

Comando directo desde `apps/web`, ejecutado antes del cambio estructural:

```powershell
node --require tsx/cjs --test tests/unit/appointment-create.test.cts tests/unit/appointment-concurrency.test.cts tests/unit/appointment-notes.test.cts tests/unit/appointment-notification.test.cts tests/unit/reception-booking-transaction.test.cts tests/integration/reception-booking.test.cts tests/integration/clinical-note-permissions.test.cts
```

Resumen literal de la salida TAP, código de salida 0:

```text
1..51
# tests 51
# suites 0
# pass 51
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1773.2793
```

## Ejecución posterior al refactor

Se repitió exactamente el mismo comando con los mismos archivos de pruebas,
sin modificar sus expectativas. Resumen literal, código de salida 0:

```text
1..51
# tests 51
# suites 0
# pass 51
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2089.9697
```

Para repetir las siete suites desde la raíz:

```powershell
pnpm --filter web test:appointments
```

En PowerShell se puede usar `pnpm.cmd` si la política local bloquea `pnpm.ps1`.
Las pruebas se ejecutaron fuera del entorno restringido con aprobación automática,
debido al fallo ya comprobado de tsx dentro de ese entorno. Todas las dependencias
externas utilizadas en estos escenarios están simuladas; no se enviaron correos
ni se modificaron datos reales.

## Verificaciones adicionales

| Comprobación | Antes | Después |
|---|---|---|
| `pnpm.cmd typecheck` | Código 0; 4 tareas correctas, 3 desde caché; 12.585 s | Código 0; 4 tareas correctas, 3 desde caché; 13.994 s |
| `pnpm.cmd lint` | Código 0; 0 errores y 33 advertencias; 16.515 s | Código 0; 0 errores y las mismas 33 advertencias en archivos ajenos; 16.456 s |
| Nueva suite | SHA-256 registrado antes | Mismo SHA-256 después |
| Otros métodos del servicio | Referencia conservada | Comparación textual: sin cambios desde `confirm()` hasta el final; lecturas previas también conservadas |
| Dependencias revisadas | SHA-256 registrado | Sin cambios en repository, notificaciones, transacciones, reasignación, ruta principal, schemas compartidos y schema Prisma |
| `git diff --check` de servicio y package.json | — | Código 0; sin errores de espacios |

Las duraciones son evidencia de ejecución, no una medición de mejora de rendimiento.
No se modificaron dependencias ni migraciones.

## Límites y pasos pendientes

- El refactor realizado corresponde a creación; las demás propuestas de Citas
  siguen pendientes y requieren su propio alcance y verificación.
- No se midió cobertura porcentual. Las pruebas del servicio simulan sus
  dependencias y no demuestran rollback, aislamiento ni concurrencia en PostgreSQL.
- La protección transaccional existente se conserva; la comprobación previa
  de cruces del servicio no constituye por sí sola una garantía de concurrencia.
- No se probaron envíos reales de correo ni interacciones de navegador en este paso.
- Los archivos `.cts` no forman parte de los patrones habituales de typecheck
  de la aplicación; ejecutar los tests no comprueba estáticamente todos sus tipos.
- Se conservaron las reglas, firmas públicas y contratos existentes. No se
  incorporan correcciones de negocio dentro de esta extracción.

## Uso de IA y evidencia para presentación

La IA apoyó las pruebas de caracterización y la extracción de responsabilidades.
Las decisiones se contrastaron con el archivo capturado y con ejecuciones reales.

Para presentar la evidencia, comparar la captura anterior de 58–103 con la
coordinación actual de 61–80 y los privados de 82–120, y adjuntar ambos resultados
de pruebas. Este documento conserva el archivo completo en las dos versiones.
No se creó un commit ni se publicó el cambio en este paso.

