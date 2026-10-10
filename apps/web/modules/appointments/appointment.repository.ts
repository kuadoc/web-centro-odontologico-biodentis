import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@biodentis/shared-types";

export class AppointmentRepository {
  async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
        clinicalRecord: { select: { notes: true } },
      },
    });
  }

  async findMany(filter: { patientId?: string; dentistId?: string; statuses?: AppointmentStatus[]; from?: Date; to?: Date }) {
    return prisma.appointment.findMany({
      where: {
        patientId: filter.patientId,
        dentistId: filter.dentistId,
        status: filter.statuses ? { in: filter.statuses } : undefined,
        date: filter.from && filter.to ? { gte: filter.from, lte: filter.to } : undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
        clinicalRecord: { select: { notes: true } },
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
    status?: AppointmentStatus;
  }) {
    return prisma.appointment.create({ data });
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    return prisma.appointment.update({ where: { id }, data: { status } });
  }

  /** Crea la nota clínica y marca la cita como COMPLETED de forma atómica. */
  async completeWithRecord(id: string, patientId: string, dentistId: string, notes: string) {
    return prisma.$transaction(async (tx) => {
      await tx.clinicalRecord.create({ data: { patientId, dentistId, appointmentId: id, notes } });
      return tx.appointment.update({ where: { id }, data: { status: "COMPLETED" } });
    });
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
