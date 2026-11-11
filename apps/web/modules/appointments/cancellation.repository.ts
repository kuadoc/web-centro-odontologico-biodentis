import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { AuditService } from "@/modules/audit/audit.service";
import { AuditRepository } from "@/modules/audit/audit.repository";
import { withScheduleTransaction } from "./schedule-transaction.repository";

export class CancellationRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma, private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma) {}
  withTransaction<T>(operation: (repository: CancellationRepository) => Promise<T>) {
    return withScheduleTransaction(this.transactions, (tx) => operation(new CancellationRepository(tx, this.transactions)), "Esta cita ya tiene una solicitud pendiente de revisión.");
  }
  findActor(id: string) {
    return this.db.user.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, role: true, isActive: true } });
  }
  findAppointment(id: string) {
    return this.db.appointment.findUnique({ where: { id }, include: { patient: { select: { id: true, firstName: true, lastName: true } }, dentist: { include: { user: { select: { firstName: true, lastName: true } } } }, clinicalRecord: { select: { id: true } } } });
  }
  findOpenRequest(appointmentId: string) { return this.db.appointmentCancellation.findUnique({ where: { activeAppointmentId: appointmentId } }); }
  findRequest(id: string) { return this.db.appointmentCancellation.findUnique({ where: { id } }); }
  create(data: Prisma.AppointmentCancellationUncheckedCreateInput) { return this.db.appointmentCancellation.create({ data }); }
  cancelAppointment(id: string, status: "PENDING" | "CONFIRMED", actorId: string, reason: string, now: Date) {
    return this.db.appointment.updateMany({ where: { id, status }, data: { status: "CANCELLED", cancellationReason: reason, cancelledById: actorId, cancelledAt: now } });
  }
  resolve(id: string, data: Prisma.AppointmentCancellationUncheckedUpdateManyInput) {
    return this.db.appointmentCancellation.updateMany({ where: { id, state: "REQUESTED" }, data });
  }
  record(actorId: string, appointmentId: string, action: string, detail: unknown) {
    return new AuditService(new AuditRepository(this.db)).log(actorId, action, "Appointment", appointmentId, JSON.stringify(detail));
  }
  async report(page: number, pageSize: number, state?: "REQUESTED" | "APPROVED" | "REJECTED") {
    const where = state ? { state } : {};
    const [items, total] = await Promise.all([
      this.db.appointmentCancellation.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, include: { appointment: { select: { status: true } } } }),
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
