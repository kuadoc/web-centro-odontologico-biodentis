import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export interface AvailableSlot {
  startTime: string
  endTime: string
}

export class AvailabilityRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}
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
    return prisma.$transaction([
      prisma.availability.deleteMany({ where: { dentistId } }),
      prisma.availability.createMany({
        data: days.map((d) => ({ dentistId, ...d })),
      }),
    ])
  }

  /** Excepcion (del dentista o de toda la clinica) que se solapa con el dia `date` (00:00 UTC). */
  async findException(dentistId: string, date: Date) {
    const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    return this.db.scheduleException.findFirst({
      where: {
        OR: [{ dentistId }, { scope: "CLINIC" }],
        status: { not: "CANCELLED" },
        startDate: { lt: dayEnd },
        endDate: { gte: date },
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
