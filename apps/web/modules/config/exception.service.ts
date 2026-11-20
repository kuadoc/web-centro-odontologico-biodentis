import { AddScheduleExceptionSchema, ListScheduleExceptionsQuerySchema } from "@biodentis/shared-validators";
import { DomainError, NotFoundError, ScheduleConflictError } from "@/lib/errors";
import { appointmentInstant } from "@/lib/clinic-calendar";
import { ExceptionRepository } from "./exception.repository";

export class ExceptionService {
  constructor(private readonly repository = new ExceptionRepository()) {}

  async list(query: unknown) {
    const parsed = ListScheduleExceptionsQuerySchema.parse(query);
    return this.repository.list({
      ...parsed,
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
    });
  }

  async create(data: unknown, actorId: string) {
    const parsed = AddScheduleExceptionSchema.parse(data);
    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);

    if (endDate < startDate) {
      throw new DomainError("La fecha de fin no puede ser anterior a la de inicio");
    }

    // Solo se persiste el objetivo que corresponde al scope
    const dentistId = parsed.scope === "DENTIST" ? parsed.dentistId : undefined;
    const dentalUnitId = parsed.scope === "UNIT" ? parsed.dentalUnitId : undefined;

    return this.repository.withTransaction(async (repository) => {
      if (dentistId && !(await repository.dentistExists(dentistId))) {
        throw new NotFoundError("Odontólogo no encontrado");
      }
      if (dentalUnitId && !(await repository.dentalUnitExists(dentalUnitId))) {
        throw new NotFoundError("Unidad dental no encontrada");
      }
      if (await repository.findOverlapping({ scope: parsed.scope, dentistId, dentalUnitId }, startDate, endDate)) {
        throw new ScheduleConflictError("Ya existe una excepción que se solapa con ese rango");
      }

      const candidates = await repository.findAffectedAppointments({ scope: parsed.scope, dentistId, dentalUnitId }, startDate, endDate);
      const conflicts = candidates.filter((appointment) =>
        appointmentInstant(appointment.date, appointment.startTime) <= endDate &&
        appointmentInstant(appointment.date, appointment.endTime) > startDate
      );
      if (conflicts.some((appointment) => appointment.status === "CONFIRMED")) {
        const pending = conflicts.filter((appointment) => appointment.status === "PENDING").length;
        const confirmed = conflicts.length - pending;
        const detail = conflicts.slice(0, 5).map((appointment) =>
          `${appointment.date.toISOString().slice(0, 10)}, ${appointment.startTime}–${appointment.endTime}: ${appointment.patient.firstName} ${appointment.patient.lastName}, Dr./Dra. ${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName} (${appointment.status === "PENDING" ? "pendiente" : "confirmada"}).`
        ).join("\n");
        throw new ScheduleConflictError(
          `No se puede registrar la excepción: hay ${pending} ${pending === 1 ? "cita pendiente" : "citas pendientes"} y ${confirmed} ${confirmed === 1 ? "cita confirmada" : "citas confirmadas"} en el período y recurso seleccionados.\n${detail}${conflicts.length > 5 ? `\nY ${conflicts.length - 5} citas más.` : ""}\nCoordina con Recepción la reprogramación o reasignación de las pendientes y con Administración la de las confirmadas. No se guardó la excepción ni se modificaron las citas.`
        );
      }

      await repository.cancelPending(conflicts.filter((appointment) => appointment.status === "PENDING").map(({ id }) => id), actorId);

      const exception = await repository.create({
        scope: parsed.scope,
        dentistId,
        dentalUnitId,
        startDate,
        endDate,
        reason: parsed.reason,
      });
      await repository.record(actorId, exception.id, JSON.stringify({ ...parsed, dentistId, dentalUnitId }));
      return exception;
    });
  }
}
