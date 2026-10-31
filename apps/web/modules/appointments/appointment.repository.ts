import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@biodentis/shared-types";
import { Prisma, type PrismaClient } from "@prisma/client";
import { NotFoundError, ScheduleConflictError } from "@/lib/errors";

export class AppointmentRepository {
  constructor(private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma) {}

  /** Reintenta toda la operación si PostgreSQL detecta escrituras concurrentes. */
  private async writeSchedule<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.transactions.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
        if (error.code === "P2002") {
          throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
        }
        if (error.code !== "P2034") throw error;
      }
    }
    throw new ScheduleConflictError("La agenda cambió durante la reserva. Vuelve a consultar los horarios disponibles.");
  }

  private async requireFreeSlot(
    tx: Prisma.TransactionClient,
    dentistId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await tx.appointment.findFirst({
      where: {
        dentistId,
        date,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        status: { not: "CANCELLED" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) throw new ScheduleConflictError("El odontólogo ya tiene una cita en ese horario");
  }

  async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
        clinicalRecord: { select: { notes: true } },
        treatment: { select: { id: true, name: true, category: true, specialty: { select: { name: true } } } },
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
        treatment: { select: { id: true, name: true, category: true, specialty: { select: { name: true } } } },
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
    treatmentId?: string;
    status?: AppointmentStatus;
  }) {
    return this.writeSchedule(async (tx) => {
      await this.requireFreeSlot(tx, data.dentistId, data.date, data.startTime, data.endTime);
      return tx.appointment.create({ data });
    });
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
    return this.writeSchedule(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id }, select: { dentistId: true } });
      if (!appointment) throw new NotFoundError("Cita no encontrada");
      await this.requireFreeSlot(tx, appointment.dentistId, date, startTime, endTime, id);
      return tx.appointment.update({ where: { id }, data: { date, startTime, endTime } });
    });
  }

  async findConflicting(dentistId: string, date: Date, startTime: string, excludeId?: string, endTime?: string) {
    return prisma.appointment.findFirst({
      where: {
        dentistId,
        date,
        startTime: endTime ? { lt: endTime } : startTime,
        ...(endTime ? { endTime: { gt: startTime } } : {}),
        status: { not: "CANCELLED" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }
}
