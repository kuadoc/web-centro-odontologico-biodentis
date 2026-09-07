import { prisma } from "@/lib/prisma";

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

export class AvailabilityRepository {
  async findByDentistAndDay(dentistId: string, dayOfWeek: number) {
    return prisma.availability.findMany({ where: { dentistId, dayOfWeek } });
  }

  async findException(dentistId: string, date: Date) {
    return prisma.scheduleException.findFirst({
      where: {
        dentistId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }

  async findBookedAppointments(dentistId: string, date: Date) {
    return prisma.appointment.findMany({
      where: { dentistId, date, status: { not: "CANCELLED" } },
      select: { startTime: true },
    });
  }

  async upsert(dentistId: string, data: { dayOfWeek: number; startTime: string; endTime: string }) {
    return prisma.availability.upsert({
      where: { dentistId_dayOfWeek: { dentistId, dayOfWeek: data.dayOfWeek } },
      update: { startTime: data.startTime, endTime: data.endTime },
      create: { dentistId, ...data },
    });
  }

  async addException(dentistId: string, startDate: Date, endDate: Date, reason?: string) {
    return prisma.scheduleException.create({
      data: { dentistId, startDate, endDate, reason },
    });
  }

  async removeException(dentistId: string, startDate: Date) {
    return prisma.scheduleException.deleteMany({ where: { dentistId, startDate } });
  }
}
