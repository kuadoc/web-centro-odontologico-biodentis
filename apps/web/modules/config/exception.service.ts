import { AddScheduleExceptionSchema, ListScheduleExceptionsQuerySchema } from "@biodentis/shared-validators";
import { DomainError, NotFoundError, ScheduleConflictError } from "@/lib/errors";
import { AuditService } from "@/modules/audit/audit.service";
import { ExceptionRepository } from "./exception.repository";

const exceptionRepository = new ExceptionRepository();
const auditService = new AuditService();

export class ExceptionService {
  async list(query: unknown) {
    const parsed = ListScheduleExceptionsQuerySchema.parse(query);
    return exceptionRepository.list({
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

    if (dentistId && !(await exceptionRepository.dentistExists(dentistId))) {
      throw new NotFoundError("Odontólogo no encontrado");
    }
    if (dentalUnitId && !(await exceptionRepository.dentalUnitExists(dentalUnitId))) {
      throw new NotFoundError("Unidad dental no encontrada");
    }
    if (await exceptionRepository.findOverlapping({ scope: parsed.scope, dentistId, dentalUnitId }, startDate, endDate)) {
      throw new ScheduleConflictError("Ya existe una excepción que se solapa con ese rango");
    }

    const exception = await exceptionRepository.create({
      scope: parsed.scope,
      dentistId,
      dentalUnitId,
      startDate,
      endDate,
      reason: parsed.reason,
    });
    await auditService.log(actorId, "CREATE_SCHEDULE_EXCEPTION", "ScheduleException", exception.id, parsed.reason ?? parsed.scope);
    return exception;
  }
}
