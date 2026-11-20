import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class AppointmentReportRepository {
  async data(start: string, end: string, today: string, time: string, patientId?: string, dentistId?: string, admin = false) {
    const scope: Prisma.AppointmentWhereInput = { ...(patientId ? { patientId } : {}), ...(dentistId ? { dentistId } : {}) };
    const [appointments, completedAllTime, dentistOptions, worker] = await Promise.all([
      prisma.appointment.findMany({
        where: { ...scope, date: { gte: new Date(start), lte: new Date(end) } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }, { id: "asc" }],
        select: { id: true, patientId: true, dentistId: true, date: true, startTime: true, endTime: true, status: true,
          patient: { select: { firstName: true, lastName: true, email: true } },
          dentist: { select: { user: { select: { firstName: true, lastName: true } } } },
          treatment: { select: { id: true, name: true, category: true, specialty: { select: { id: true, name: true } } } },
          emailOutbox: { where: { kind: { startsWith: "REMINDER:" } }, select: { kind: true, attempts: true, deliveredAt: true, availableAt: true, outcome: true } },
        },
      }),
      prisma.appointment.count({ where: { ...scope, status: "COMPLETED", OR: [{ date: { lt: new Date(today) } }, { date: new Date(today), startTime: { lte: time } }] } }),
      prisma.dentist.findMany({ where: patientId ? { appointments: { some: { patientId } } } : {}, select: { id: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { user: { lastName: "asc" } } }),
      admin ? prisma.scheduledJobRun.findFirst({ where: { job: "appointment-reminders" }, orderBy: { startedAt: "desc" } }) : Promise.resolve(null),
    ]);
    return { appointments, completedAllTime, dentistOptions, worker };
  }
}
