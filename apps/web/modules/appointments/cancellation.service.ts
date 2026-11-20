import { CatalogIdSchema, CancelAppointmentSchema, ReviewAppointmentCancellationSchema, CancellationSnapshotSchema, CancellationActorSchema, CancellationReportQuerySchema, ExportAppointmentReportSchema, type CancellationReport } from "@biodentis/shared-validators";
import { AuthorizationError, DomainError, NotFoundError } from "@/lib/errors";
import { clinicDateKey } from "@/lib/clinic-calendar";
import { CancellationRepository } from "./cancellation.repository";
import { canCancelOrReschedule } from "@biodentis/shared-validators";

export class CancellationService {
  constructor(private readonly repository = new CancellationRepository()) {}
  private async actor(repository: CancellationRepository, id: string, role: "ADMIN" | "RECEPTIONIST" | "PATIENT") {
    const actor = await repository.findActor(id);
    if (!actor?.isActive || actor.role !== role) throw new AuthorizationError("Tu rol no puede realizar esta operación de cancelación.");
    return CancellationActorSchema.parse({ id: actor.id, name: `${actor.firstName} ${actor.lastName}`, role: actor.role });
  }
  private async appointment(repository: CancellationRepository, id: string, status: "PENDING" | "CONFIRMED") {
    const appointment = await repository.findAppointment(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (appointment.status !== status) throw new DomainError("El estado de la cita cambió o no permite esta operación.", 409);
    if (appointment.clinicalRecord) throw new DomainError("Una cita con atención clínica registrada no puede cancelarse.", 409);
    return appointment;
  }
  private snapshot(appointment: NonNullable<Awaited<ReturnType<CancellationRepository["findAppointment"]>>>, actor: ReturnType<typeof CancellationActorSchema.parse>) {
    return CancellationSnapshotSchema.parse({ appointmentId: appointment.id, patient: { id: appointment.patient.id, name: `${appointment.patient.firstName} ${appointment.patient.lastName}` }, dentist: { id: appointment.dentist.id, name: `${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}` }, date: appointment.date.toISOString().slice(0, 10), startTime: appointment.startTime, endTime: appointment.endTime, requestedBy: actor });
  }
  async cancel(id: string, input: unknown, actorId: string) {
    CatalogIdSchema.parse(id);
    const { reason } = CancelAppointmentSchema.parse(input);
    return this.repository.withTransaction(async (repository) => {
      const actor = await this.actor(repository, actorId, "RECEPTIONIST");
      const appointment = await this.appointment(repository, id, "PENDING");
      const snapshot = this.snapshot(appointment, actor);
      const now = new Date();
      const updated = await repository.cancelAppointment(id, "PENDING", actorId, reason, now);
      if (updated.count !== 1) throw new DomainError("La cita cambió; actualiza la bandeja.", 409);
      const entry = await repository.create({ appointmentId: id, originalStatus: "PENDING", state: "APPROVED", requestedById: actorId, requestReason: reason, snapshot, reviewedById: actorId, reviewerSnapshot: actor, reviewedAt: now });
      await repository.record(actorId, id, "CANCEL_APPOINTMENT", { ...snapshot, cancellationId: entry.id, reason });
      return { id: entry.id, state: entry.state };
    });
  }
  async cancelOwn(id: string, input: unknown, patientId: string) {
    CatalogIdSchema.parse(id);
    const { reason } = CancelAppointmentSchema.parse(input);
    return this.repository.withTransaction(async (repository) => {
      const actor = await this.actor(repository, patientId, "PATIENT");
      const appointment = await repository.findAppointment(id);
      if (!appointment) throw new NotFoundError("Cita no encontrada");
      if (appointment.patientId !== patientId) throw new AuthorizationError("Solo puedes cancelar tus propias citas.");
      if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") throw new DomainError("Solo puedes cancelar citas pendientes o confirmadas.", 409);
      if (appointment.clinicalRecord) throw new DomainError("La cita tiene una atención registrada.", 409);
      if (!canCancelOrReschedule(appointment.date, appointment.startTime)) throw new DomainError("Para cancelar con 24 horas o menos, contacta por teléfono o presencialmente con Recepción.");
      if (await repository.findOpenRequest(id)) throw new DomainError("Recepción ya está gestionando una cancelación de esta cita.", 409);
      const snapshot = this.snapshot(appointment, actor);
      const now = new Date();
      const updated = await repository.cancelAppointment(id, appointment.status, patientId, reason, now);
      if (updated.count !== 1) throw new DomainError("La cita cambió; actualiza la página.", 409);
      const entry = await repository.create({ appointmentId: id, originalStatus: appointment.status, state: "APPROVED", requestedById: patientId, requestReason: reason, snapshot, reviewedById: patientId, reviewerSnapshot: actor, reviewedAt: now });
      await repository.record(patientId, id, "CANCEL_OWN_APPOINTMENT", { ...snapshot, reason });
      return { id: entry.id, state: entry.state };
    });
  }
  async request(id: string, input: unknown, actorId: string) {
    CatalogIdSchema.parse(id);
    const { reason } = CancelAppointmentSchema.parse(input);
    return this.repository.withTransaction(async (repository) => {
      const actor = await this.actor(repository, actorId, "RECEPTIONIST");
      const appointment = await this.appointment(repository, id, "CONFIRMED");
      if (await repository.findOpenRequest(id)) throw new DomainError("Esta cita ya tiene una solicitud pendiente de revisión.", 409);
      const snapshot = this.snapshot(appointment, actor);
      const entry = await repository.create({ appointmentId: id, originalStatus: "CONFIRMED", requestedById: actorId, requestReason: reason, snapshot, activeAppointmentId: id });
      await repository.record(actorId, id, "REQUEST_APPOINTMENT_CANCELLATION", { ...snapshot, cancellationId: entry.id, reason });
      return { id: entry.id, state: entry.state };
    });
  }
  async review(id: string, input: unknown, actorId: string) {
    CatalogIdSchema.parse(id);
    const { decision, reason } = ReviewAppointmentCancellationSchema.parse(input);
    return this.repository.withTransaction(async (repository) => {
      const actor = await this.actor(repository, actorId, "ADMIN");
      const entry = await repository.findRequest(id);
      if (!entry) throw new NotFoundError("Solicitud no encontrada");
      if (entry.state !== "REQUESTED" || !entry.activeAppointmentId) throw new DomainError("La solicitud ya fue resuelta.", 409);
      const snapshot = CancellationSnapshotSchema.parse(entry.snapshot);
      const now = new Date();
      if (decision === "APPROVE") {
        await this.appointment(repository, entry.appointmentId, "CONFIRMED");
        const updated = await repository.cancelAppointment(entry.appointmentId, "CONFIRMED", actorId, `Recepción: ${entry.requestReason}\nAdministración: ${reason}`, now);
        if (updated.count !== 1) throw new DomainError("La cita cambió; actualiza el reporte.", 409);
      }
      const state = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      const updated = await repository.resolve(id, { state, reviewedById: actorId, reviewerSnapshot: actor, reviewReason: reason, reviewedAt: now, activeAppointmentId: null });
      if (updated.count !== 1) throw new DomainError("Otro administrador ya resolvió esta solicitud.", 409);
      await repository.record(actorId, entry.appointmentId, `${decision}_APPOINTMENT_CANCELLATION`, { ...snapshot, cancellationId: id, requestReason: entry.requestReason, reviewedBy: actor, reviewReason: reason });
      return { id, state, appointmentId: entry.appointmentId };
    });
  }
  async report(input: unknown): Promise<CancellationReport> {
    const { page, pageSize, state } = CancellationReportQuerySchema.parse(input);
    const [year, month] = clinicDateKey(new Date()).split("-").map(Number) as [number, number, number];
    const keys = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(year, month - 6 + i, 1)).toISOString().slice(0, 7));
    const [report, analytics] = await Promise.all([this.repository.report(page, pageSize, state), this.repository.analytics(new Date(`${keys[0]}-01T00:00:00-05:00`))]);
    const items = this.reportItems(report.items);
    return { items, total: report.total, page, pageSize, summary: analytics.summary, activity: keys.map((month) => analytics.months.find((entry) => entry.month === month) ?? { month, requests: 0, cancellations: 0, reassignments: 0 }) };
  }

  async exportItems(input: unknown) {
    const { state } = ExportAppointmentReportSchema.parse(input);
    const { items } = await this.repository.report(1, undefined, state);
    return this.reportItems(items);
  }

  private reportItems(items: Awaited<ReturnType<CancellationRepository["report"]>>["items"]): CancellationReport["items"] {
    return items.map((entry) => {
      if (entry.originalStatus !== "PENDING" && entry.originalStatus !== "CONFIRMED") throw new DomainError("Registro de cancelación inválido", 500);
      return { ...CancellationSnapshotSchema.parse(entry.snapshot), id: entry.id, state: entry.state, originalStatus: entry.originalStatus as "PENDING" | "CONFIRMED", currentStatus: entry.appointment.status, requestReason: entry.requestReason, reviewReason: entry.reviewReason, reviewedBy: entry.reviewerSnapshot ? CancellationActorSchema.parse(entry.reviewerSnapshot) : null, createdAt: entry.createdAt.toISOString(), reviewedAt: entry.reviewedAt?.toISOString() ?? null };
    });
  }
}
