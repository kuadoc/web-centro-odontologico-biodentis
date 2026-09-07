import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@biodentis/shared-types";

export class AppointmentRepository {
  async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async findMany(filter: { patientId?: string; dentistId?: string; status?: AppointmentStatus; from?: Date; to?: Date }) {
    return prisma.appointment.findMany({
      where: {
        patientId: filter.patientId,
        dentistId: filter.dentistId,
        status: filter.status as AppointmentStatus | undefined,
        date: filter.from && filter.to ? { gte: filter.from, lte: filter.to } : undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: "desc" },
    });
  }

  async create(data: {
    patientId: string;
    dentistId: string;
    date: Date;
    startTime: string;
    endTime: string;
    notes?: string;
  }) {
    return prisma.appointment.create({ data });
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    return prisma.appointment.update({ where: { id }, data: { status } });
  }

  async reschedule(id: string, date: Date, startTime: string, endTime: string) {
    return prisma.appointment.update({ where: { id }, data: { date, startTime, endTime } });
  }

  async findConflicting(dentistId: string, date: Date, startTime: string, excludeId?: string) {
    return prisma.appointment.findFirst({
      where: {
        dentistId,
        date,
        startTime,
        status: { not: "CANCELLED" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }
}
