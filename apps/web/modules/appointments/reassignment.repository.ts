import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { AuditService } from "@/modules/audit/audit.service";
import { AuditRepository } from "@/modules/audit/audit.repository";
import { AvailabilityRepository } from "@/modules/availability/availability.repository";
import { withScheduleTransaction } from "./schedule-transaction.repository";

export const REASSIGNMENT_ACTION = "REASSIGN_APPOINTMENT";

export class ReassignmentRepository {
  constructor(
    private readonly db: Prisma.TransactionClient = prisma,
    private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma,
  ) {}

  withTransaction<T>(operation: (repository: ReassignmentRepository) => Promise<T>) {
    return withScheduleTransaction(this.transactions, (tx) => operation(new ReassignmentRepository(tx, this.transactions)));
  }

  findActor(id: string) {
    return this.db.user.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, role: true, isActive: true } });
  }

  findAppointment(id: string) {
    return this.db.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
        treatment: { select: { specialtyId: true, category: true } },
        clinicalRecord: { select: { id: true } },
        cancellations: { where: { state: "REQUESTED" }, select: { id: true }, take: 1 },
      },
    });
  }

  findDentist(id: string) {
    return this.db.dentist.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, isActive: true, role: true } },
        specialties: { select: { id: true } },
        availability: true,
      },
    });
  }

  findException(dentistId: string, date: Date, dentalUnitId?: string | null) {
    return new AvailabilityRepository(this.db).findException(dentistId, date, dentalUnitId);
  }

  findConflict(dentistId: string, date: Date, startTime: string, endTime: string, excludeId: string) {
    return this.db.appointment.findFirst({
      where: { dentistId, date, startTime: { lt: endTime }, endTime: { gt: startTime }, status: { not: "CANCELLED" }, id: { not: excludeId } },
      select: { id: true },
    });
  }

  updateDentist(appointmentId: string, dentistId: string) {
    return this.db.appointment.update({ where: { id: appointmentId }, data: { dentistId } });
  }

  record(actorId: string, appointmentId: string, details: string) {
    return new AuditService(new AuditRepository(this.db)).log(actorId, REASSIGNMENT_ACTION, "Appointment", appointmentId, details);
  }

  async report(page: number, pageSize: number) {
    const where = { action: REASSIGNMENT_ACTION, resourceType: "Appointment" };
    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, details: true, createdAt: true } }),
      this.db.auditLog.count({ where }),
    ]);
    return { items, total };
  }
}
