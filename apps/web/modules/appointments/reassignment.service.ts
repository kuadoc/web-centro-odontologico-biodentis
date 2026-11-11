import { Role } from "@biodentis/shared-types";
import {
  CatalogIdSchema, ReassignAppointmentSchema, ReassignmentAuditDetailSchema,
  ReassignmentReportQuerySchema, type ReassignmentReport,
} from "@biodentis/shared-validators";
import { AuthorizationError, DomainError, InfrastructureError, NotFoundError, ScheduleConflictError } from "@/lib/errors";
import { ReassignmentRepository } from "./reassignment.repository";

export class ReassignmentService {
  constructor(private readonly repository = new ReassignmentRepository()) {}

  async reassign(id: string, input: unknown, actorId: string) {
    const appointmentId = CatalogIdSchema.parse(id);
    const parsed = ReassignAppointmentSchema.parse(input);
    return this.repository.withTransaction(async (repository) => {
      const actor = await repository.findActor(actorId);
      if (!actor?.isActive || ![Role.ADMIN, Role.RECEPTIONIST].includes(actor.role as Role)) throw new AuthorizationError();
      const appointment = await repository.findAppointment(appointmentId);
      if (!appointment) throw new NotFoundError("Cita no encontrada");
      const permitted = (appointment.status === "PENDING" && actor.role === "RECEPTIONIST") ||
        (appointment.status === "CONFIRMED" && actor.role === "ADMIN");
      if (!permitted) throw new AuthorizationError("Recepción reasigna citas pendientes y Administración reasigna citas confirmadas.");
      if (appointment.clinicalRecord) throw new DomainError("La cita ya tiene un registro clínico y no puede reasignarse.", 409);
      if (appointment.cancellations?.length) throw new DomainError("Resuelve la solicitud de cancelación antes de reasignar esta cita.", 409);
      if (appointment.dentistId === parsed.dentistId) throw new DomainError("Selecciona un odontólogo diferente al actual.");
      const dentist = await repository.findDentist(parsed.dentistId);
      if (!dentist || !dentist.user.isActive || dentist.user.role !== "DENTIST") throw new DomainError("El nuevo odontólogo debe tener una cuenta activa.", 409);
      if (appointment.treatment?.specialtyId && !dentist.specialties.some((specialty) => specialty.id === appointment.treatment?.specialtyId)) {
        throw new DomainError("El odontólogo seleccionado no atiende la especialidad de esta cita.", 409);
      }
      if (appointment.treatment && !appointment.treatment.specialtyId && dentist.specialty !== appointment.treatment.category) {
        throw new DomainError("El odontólogo seleccionado no atiende el servicio de esta cita.", 409);
      }
      const available = dentist.availability.some((block) => block.dayOfWeek === appointment.date.getUTCDay() && block.startTime <= appointment.startTime && block.endTime >= appointment.endTime);
      if (!available || await repository.findException(dentist.id, appointment.date, appointment.dentalUnitId)) throw new ScheduleConflictError("El odontólogo, la clínica o la unidad asignada tienen un bloqueo de calendario o no hay disponibilidad. Gestiona una reprogramación.");
      if (await repository.findConflict(dentist.id, appointment.date, appointment.startTime, appointment.endTime, appointment.id)) throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario.");
      const name = (user: { firstName: string; lastName: string }) => `${user.firstName} ${user.lastName}`;
      const detail = ReassignmentAuditDetailSchema.parse({
        appointmentId: appointment.id,
        patient: { id: appointment.patientId, name: name(appointment.patient) },
        previousDentist: { id: appointment.dentistId, name: name(appointment.dentist.user) },
        newDentist: { id: dentist.id, name: name(dentist.user) },
        actor: { id: actor.id, name: name(actor), role: actor.role },
        status: appointment.status, date: appointment.date.toISOString().slice(0, 10),
        startTime: appointment.startTime, endTime: appointment.endTime, reason: parsed.reason,
      });
      const updated = await repository.updateDentist(appointment.id, dentist.id);
      await repository.record(actor.id, appointment.id, JSON.stringify(detail));
      return updated;
    });
  }

  async report(input: unknown): Promise<ReassignmentReport> {
    const { page, pageSize } = ReassignmentReportQuerySchema.parse(input);
    const { items, total } = await this.repository.report(page, pageSize);
    return {
      items: items.map((entry) => {
        try {
          const detail = ReassignmentAuditDetailSchema.parse(JSON.parse(entry.details ?? ""));
          return { ...detail, id: entry.id, createdAt: entry.createdAt.toISOString() };
        } catch {
          throw new InfrastructureError("No se pudo leer un registro de reasignación. Contacta al administrador.");
        }
      }), total, page, pageSize,
    };
  }
}
