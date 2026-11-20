import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { AuditService } from "@/modules/audit/audit.service";
import { AuditRepository } from "@/modules/audit/audit.repository";
import { withScheduleTransaction } from "./schedule-transaction.repository";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { AuthorizationError, DomainError } from "@/lib/errors";

export class CancellationRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma, private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma) {}
  withTransaction<T>(operation: (repository: CancellationRepository) => Promise<T>) {
    return withScheduleTransaction(this.transactions, (tx) => operation(new CancellationRepository(tx, this.transactions)), "Esta cita ya tiene una solicitud pendiente de revisión.");
  }
  findActor(id: string) {
    return this.db.user.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, role: true, isActive: true } });
  }
  async cancelPendingAutomatically(ids: string[], actorId: string, reason: string) {
    if (!ids.length) return;
    const actor = await this.findActor(actorId);
    if (!actor?.isActive || actor.role !== "ADMIN") throw new AuthorizationError("Solo Administración puede aplicar esta cancelación automática.");
    for (const id of ids) {
      const appointment = await this.findAppointment(id);
      if (!appointment || appointment.status !== "PENDING" || appointment.clinicalRecord) throw new DomainError("Una cita cambió durante la operación.", 409);
      const who = { id: actor.id, name: `${actor.firstName} ${actor.lastName}`, role: actor.role };
      const snapshot = { appointmentId: id, patient: { id: appointment.patient.id, name: `${appointment.patient.firstName} ${appointment.patient.lastName}` }, dentist: { id: appointment.dentist.id, name: `${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}` }, date: appointment.date.toISOString().slice(0, 10), startTime: appointment.startTime, endTime: appointment.endTime, requestedBy: who };
      const now = new Date();
      const result = await this.cancelAppointment(id, "PENDING", actorId, reason, now);
      if (result.count !== 1) throw new DomainError("La cita cambió de estado.", 409);
      await this.create({ appointmentId: id, originalStatus: "PENDING", state: "APPROVED", requestedById: actorId, requestReason: reason, snapshot, reviewedById: actorId, reviewerSnapshot: who, reviewedAt: now });
      await this.record(actorId, id, "AUTO_CANCEL_APPOINTMENT", { reason, ...snapshot });
    }
  }
  findAppointment(id: string) {
    return this.db.appointment.findUnique({ where: { id }, include: { patient: { select: { id: true, firstName: true, lastName: true } }, dentist: { include: { user: { select: { firstName: true, lastName: true } } } }, clinicalRecord: { select: { id: true } } } });
  }
  findOpenRequest(appointmentId: string) { return this.db.appointmentCancellation.findUnique({ where: { activeAppointmentId: appointmentId } }); }
  findRequest(id: string) { return this.db.appointmentCancellation.findUnique({ where: { id } }); }
  create(data: Prisma.AppointmentCancellationUncheckedCreateInput) { return this.db.appointmentCancellation.create({ data }); }
  async cancelAppointment(id: string, status: "PENDING" | "CONFIRMED", actorId: string, reason: string, now: Date) {
    const result = await this.db.appointment.updateMany({ where: { id, status }, data: { status: "CANCELLED", cancellationReason: reason, cancelledById: actorId, cancelledAt: now } });
    if (result.count === 1) await new EmailOutboxRepository(this.db).enqueue(id, "CANCELLATION");
    return result;
  }
  resolve(id: string, data: Prisma.AppointmentCancellationUncheckedUpdateManyInput) {
    return this.db.appointmentCancellation.updateMany({ where: { id, state: "REQUESTED" }, data });
  }
  record(actorId: string, appointmentId: string, action: string, detail: unknown) {
    return new AuditService(new AuditRepository(this.db)).log(actorId, action, "Appointment", appointmentId, JSON.stringify(detail));
  }
  async report(page: number, pageSize?: number, state?: "REQUESTED" | "APPROVED" | "REJECTED") {
    const where = state ? { state } : {};
    const [items, total] = await Promise.all([
      this.db.appointmentCancellation.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...(pageSize === undefined ? {} : { skip: (page - 1) * pageSize, take: pageSize }), include: { appointment: { select: { status: true } } } }),
      this.db.appointmentCancellation.count({ where }),
    ]);
    return { items, total };
  }
  async analytics(from: Date) {
    const [counts, reassignments, months] = await Promise.all([
      this.db.appointmentCancellation.groupBy({ by: ["state"], _count: { _all: true } }),
      this.db.auditLog.count({ where: { action: "REASSIGN_APPOINTMENT", resourceType: "Appointment" } }),
      this.db.$queryRaw<Array<{ month: string; requests: bigint; cancellations: bigint; reassignments: bigint }>>`
        SELECT month, SUM(requests)::bigint AS requests, SUM(cancellations)::bigint AS cancellations, SUM(reassignments)::bigint AS reassignments FROM (
          SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima', 'YYYY-MM') AS month, 1 AS requests, 0 AS cancellations, 0 AS reassignments FROM appointment_cancellations WHERE "originalStatus" = 'CONFIRMED' AND "createdAt" >= ${from}
          UNION ALL SELECT to_char("reviewedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima', 'YYYY-MM'), 0, 1, 0 FROM appointment_cancellations WHERE state = 'APPROVED' AND "reviewedAt" >= ${from}
          UNION ALL SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima', 'YYYY-MM'), 0, 0, 1 FROM audit_logs WHERE action = 'REASSIGN_APPOINTMENT' AND "resourceType" = 'Appointment' AND "createdAt" >= ${from}
        ) events GROUP BY month ORDER BY month`,
    ]);
    const count = (state: string) => counts.find((entry) => entry.state === state)?._count._all ?? 0;
    return { summary: { requested: count("REQUESTED"), approved: count("APPROVED"), rejected: count("REJECTED"), reassignments }, months: months.map((entry) => ({ month: entry.month, requests: Number(entry.requests), cancellations: Number(entry.cancellations), reassignments: Number(entry.reassignments) })) };
  }
}
