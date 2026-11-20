import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { clinicDateKey } from "@/lib/clinic-calendar";
import { withScheduleTransaction } from "@/modules/appointments/schedule-transaction.repository";
import { AuditService } from "@/modules/audit/audit.service";
import { AuditRepository } from "@/modules/audit/audit.repository";
import { CancellationRepository } from "@/modules/appointments/cancellation.repository";
import type { z } from "zod";
import type { ExceptionScopeSchema, ExceptionStatusSchema } from "@biodentis/shared-validators";

type ExceptionScope = z.infer<typeof ExceptionScopeSchema>;
type ExceptionStatus = z.infer<typeof ExceptionStatusSchema>;

export class ExceptionRepository {
  constructor(
    private readonly db: Prisma.TransactionClient = prisma,
    private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma,
  ) {}

  withTransaction<T>(operation: (repository: ExceptionRepository) => Promise<T>) {
    return withScheduleTransaction(this.transactions, (tx) => operation(new ExceptionRepository(tx, this.transactions)));
  }

  findAffectedAppointments(
    target: { scope: ExceptionScope; dentistId?: string; dentalUnitId?: string },
    startDate: Date, endDate: Date,
  ) {
    return this.db.appointment.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        date: { gte: new Date(clinicDateKey(startDate)), lte: new Date(clinicDateKey(endDate)) },
        ...(target.scope === "DENTIST" ? { dentistId: target.dentistId } : {}),
        ...(target.scope === "UNIT" ? { dentalUnitId: target.dentalUnitId } : {}),
      },
      select: {
        id: true, date: true, startTime: true, endTime: true, status: true,
        patient: { select: { firstName: true, lastName: true } },
        dentist: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
  }

  record(actorId: string, id: string, details: string) {
    return new AuditService(new AuditRepository(this.db)).log(actorId, "CREATE_SCHEDULE_EXCEPTION", "ScheduleException", id, details);
  }
  cancelPending(ids: string[], actorId: string) {
    return new CancellationRepository(this.db, this.transactions).cancelPendingAutomatically(ids, actorId, "Cancelación automática por excepción de horario registrada por Administración.");
  }
  async list(filters: {
    dentistId?: string;
    dentalUnitId?: string;
    scope?: ExceptionScope;
    status?: ExceptionStatus;
    from?: Date;
    to?: Date;
  }) {
    return this.db.scheduleException.findMany({
      where: {
        dentistId: filters.dentistId,
        dentalUnitId: filters.dentalUnitId,
        scope: filters.scope,
        status: filters.status,
        // Solapamiento con el rango [from, to]
        ...(filters.from ? { endDate: { gte: filters.from } } : {}),
        ...(filters.to ? { startDate: { lte: filters.to } } : {}),
      },
      orderBy: { startDate: "asc" },
    });
  }

  /** Excepción no cancelada del mismo objetivo (odontólogo, unidad o clínica) que se solape con el rango. */
  async findOverlapping(
    target: { scope: ExceptionScope; dentistId?: string; dentalUnitId?: string },
    startDate: Date,
    endDate: Date
  ) {
    return this.db.scheduleException.findFirst({
      where: {
        scope: target.scope,
        ...(target.scope === "DENTIST" ? { dentistId: target.dentistId } : {}),
        ...(target.scope === "UNIT" ? { dentalUnitId: target.dentalUnitId } : {}),
        status: { not: "CANCELLED" },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  async dentistExists(dentistId: string) {
    return (await this.db.dentist.count({ where: { id: dentistId } })) > 0;
  }

  async dentalUnitExists(dentalUnitId: string) {
    return (await this.db.dentalUnit.count({ where: { id: dentalUnitId } })) > 0;
  }

  async create(data: {
    scope: ExceptionScope;
    dentistId?: string;
    dentalUnitId?: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
  }) {
    return this.db.scheduleException.create({ data: { ...data, status: "CONFIRMED" } });
  }
}
