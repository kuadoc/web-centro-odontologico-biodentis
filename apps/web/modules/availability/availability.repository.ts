import { prisma } from "@/lib/prisma"
import { appointmentInstant } from "@/lib/clinic-calendar"
import type { Prisma, PrismaClient } from "@prisma/client"
import { withScheduleTransaction } from "@/modules/appointments/schedule-transaction.repository"
import { AuditService } from "@/modules/audit/audit.service"
import { AuditRepository } from "@/modules/audit/audit.repository"

export interface AvailableSlot {
  startTime: string
  endTime: string
}

export class AvailabilityRepository {
  constructor(
    private readonly db: Prisma.TransactionClient = prisma,
    private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma
  ) {}

  withTransaction<T>(operation: (repository: AvailabilityRepository) => Promise<T>) {
    return withScheduleTransaction(this.transactions, (tx) => operation(new AvailabilityRepository(tx, this.transactions)))
  }

  findScheduledAppointments(dentistId: string) {
    return this.db.appointment.findMany({
      where: { dentistId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { id: true, date: true, startTime: true, endTime: true, status: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })
  }

  recordScheduleChange(actorId: string, dentistId: string, days: { dayOfWeek: number; startTime: string; endTime: string }[]) {
    return new AuditService(new AuditRepository(this.db)).log(actorId, "UPDATE_DENTIST_AVAILABILITY", "Dentist", dentistId, JSON.stringify({ days }))
  }
  async findByDentistAndDay(dentistId: string, dayOfWeek: number) {
    return this.db.availability.findMany({ where: { dentistId, dayOfWeek } })
  }

  async findByDentist(dentistId: string) {
    return this.db.availability.findMany({
      where: { dentistId },
      orderBy: { dayOfWeek: "asc" },
    })
  }

  async replaceWeek(
    dentistId: string,
    days: { dayOfWeek: number; startTime: string; endTime: string }[]
  ) {
    // El service invoca este reemplazo dentro de withTransaction tras validar citas.
    await this.db.availability.deleteMany({ where: { dentistId } })
    if (days.length) await this.db.availability.createMany({ data: days.map((d) => ({ dentistId, ...d })) })
  }

  /** Bloqueos del profesional, la clínica o la unidad asignada, en el día civil de Lima. */
  async findException(dentistId: string, date: Date, dentalUnitId?: string | null) {
    const dayStart = appointmentInstant(date, "00:00")
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    return this.db.scheduleException.findFirst({
      where: {
        OR: [
          { scope: "DENTIST", dentistId },
          { scope: "CLINIC" },
          ...(dentalUnitId ? [{ scope: "UNIT" as const, dentalUnitId }] : []),
        ],
        status: { not: "CANCELLED" },
        startDate: { lt: dayEnd },
        endDate: { gte: dayStart },
      },
    })
  }

  async findBookedAppointments(dentistId: string, date: Date) {
    return this.db.appointment.findMany({
      where: { dentistId, date, status: { not: "CANCELLED" } },
      select: { startTime: true, endTime: true },
    })
  }

  async upsert(
    dentistId: string,
    data: { dayOfWeek: number; startTime: string; endTime: string }
  ) {
    return this.db.availability.upsert({
      where: { dentistId_dayOfWeek: { dentistId, dayOfWeek: data.dayOfWeek } },
      update: { startTime: data.startTime, endTime: data.endTime },
      create: { dentistId, ...data },
    })
  }

  async addException(
    dentistId: string,
    startDate: Date,
    endDate: Date,
    reason?: string
  ) {
    return this.db.scheduleException.create({
      data: { dentistId, startDate, endDate, reason },
    })
  }

  async removeException(dentistId: string, startDate: Date) {
    return this.db.scheduleException.deleteMany({
      where: { dentistId, startDate },
    })
  }
}
