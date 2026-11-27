import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@biodentis/shared-types";
import { Prisma, type PrismaClient } from "@prisma/client";
import { AuthorizationError, DomainError, NotFoundError, ScheduleConflictError } from "@/lib/errors";
import { withScheduleTransaction } from "./schedule-transaction.repository";
import { AvailabilityRepository } from "@/modules/availability/availability.repository";
import { AuditService } from "@/modules/audit/audit.service";
import { AuditRepository } from "@/modules/audit/audit.repository";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { canCancelOrReschedule } from "@biodentis/shared-validators";

export class AppointmentRepository {
  constructor(private readonly transactions: Pick<PrismaClient, "$transaction"> = prisma) {}

  /** Reintenta toda la operación si PostgreSQL detecta escrituras concurrentes. */
  private async writeSchedule<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return withScheduleTransaction(this.transactions, operation);
  }

  private async requireFreeSlot(
    tx: Prisma.TransactionClient,
    dentistId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string,
    dentalUnitId?: string | null,
  ): Promise<void> {
    const dentist = await tx.dentist.findUnique({
      where: { id: dentistId }, select: { user: { select: { isActive: true, role: true } } },
    });
    if (!dentist || !dentist.user.isActive || dentist.user.role !== "DENTIST") {
      throw new DomainError("El odontólogo no está activo. Selecciona otro profesional.", 409);
    }
    if (await new AvailabilityRepository(tx).findException(dentistId, date, dentalUnitId)) {
      throw new ScheduleConflictError("Existe una excepción de calendario para el odontólogo, la clínica o la unidad asignada. Selecciona otra fecha o recurso.");
    }
    const hours = await tx.availability.findMany({ where: { dentistId, dayOfWeek: date.getUTCDay() } });
    if (!hours.some((block) => block.startTime <= startTime && block.endTime >= endTime)) {
      throw new ScheduleConflictError("El horario del odontólogo cambió o no cubre esta cita. Vuelve a consultar su disponibilidad.");
    }
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
        patient: { select: { id: true, firstName: true, lastName: true, dni: true, email: true, phone: true } },
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
        patient: { select: { id: true, firstName: true, lastName: true, dni: true, email: true, phone: true } },
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
    dentalUnitId?: string;
  }, actorId?: string) {
    return this.writeSchedule(async (tx) => {
      await this.requireFreeSlot(tx, data.dentistId, data.date, data.startTime, data.endTime, undefined, data.dentalUnitId);
      const patient = await tx.user.findUnique({ where: { id: data.patientId }, select: { role: true, isActive: true } });
      if (!patient || patient.role !== "PATIENT" || !patient.isActive) {
        throw new DomainError("El paciente seleccionado no existe o su cuenta está inactiva. Actualiza la lista y selecciona un paciente activo.", 409);
      }
      // La lectura y la creación comparten aislamiento serializable: un reintento
      // debe volver a comprobar el límite incluso si se reserva con otro odontólogo.
      const unattended = await tx.appointment.findFirst({
        where: { patientId: data.patientId, status: { in: ["PENDING", "CONFIRMED"] } },
        select: { id: true },
      });
      if (unattended) {
        throw new DomainError("Aún tienes una cita pendiente de atención. Podrás agendar una nueva cuando se complete la anterior.", 409);
      }
      const appointment = await tx.appointment.create({ data });
      await new EmailOutboxRepository(tx).enqueue(appointment.id, "BOOKING");
      if (actorId) await new AuditService(new AuditRepository(tx)).log(actorId, "CREATE_CONFIRMED_APPOINTMENT", "Appointment", appointment.id, JSON.stringify({ patientId: data.patientId, dentistId: data.dentistId, treatmentId: data.treatmentId, date: data.date.toISOString().slice(0, 10), startTime: data.startTime, endTime: data.endTime, status: data.status }));
      return appointment;
    });
  }

  async updateStatus(id: string, status: AppointmentStatus, dentistId?: string) {
    const expected = status === "CONFIRMED" ? "PENDING" : "CONFIRMED";
    try {
      return await this.writeSchedule(async (tx) => {
        const appointment = await tx.appointment.update({ where: { id, status: expected, ...(dentistId ? { dentistId } : {}) }, data: { status } });
        if (status === "CONFIRMED") await new EmailOutboxRepository(tx).enqueue(id, "CONFIRMATION");
        return appointment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new DomainError("La cita cambió de estado. Actualiza la bandeja antes de continuar.", 409);
      }
      throw error;
    }
  }

  /** Crea la nota clínica y marca la cita como COMPLETED de forma atómica. */
  async completeWithRecord(id: string, patientId: string, dentistId: string, notes: string, actorId: string) {
    return this.writeSchedule(async (tx) => {
      const actor = await tx.dentist.findUnique({ where: { userId: actorId }, select: { id: true, user: { select: { role: true, isActive: true } } } });
      if (!actor || actor.id !== dentistId || actor.user.role !== "DENTIST" || !actor.user.isActive) throw new AuthorizationError("Solo el odontólogo asignado puede registrar esta atención.");
      const updated = await tx.appointment.updateMany({ where: { id, patientId, dentistId, status: "CONFIRMED" }, data: { status: "COMPLETED", waitingStatus: "DONE" } });
      if (updated.count !== 1) throw new DomainError("La cita cambió de estado o de odontólogo. Actualiza la agenda.", 409);
      await tx.clinicalRecord.create({ data: { patientId, dentistId, appointmentId: id, notes } });
      await new AuditService(new AuditRepository(tx)).log(actorId, "CREATE_CLINICAL_RECORD", "Appointment", id, "Nota clínica y atención registradas por el odontólogo asignado.");
      return tx.appointment.findUniqueOrThrow({ where: { id } });
    });
  }

  async reschedule(id: string, date: Date, startTime: string, endTime: string, actor?: { userId: string; role: string }) {
    return this.writeSchedule(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id }, select: { patientId: true, date: true, startTime: true, dentistId: true, dentalUnitId: true, status: true, clinicalRecord: { select: { id: true } }, cancellations: { where: { state: "REQUESTED" }, select: { id: true }, take: 1 } } });
      if (!appointment) throw new NotFoundError("Cita no encontrada");
      if (actor?.role === "PATIENT") {
        if (appointment.patientId !== actor.userId) throw new AuthorizationError("Solo puedes reprogramar tus propias citas.");
        if (!canCancelOrReschedule(appointment.date, appointment.startTime)) throw new DomainError("Para reprogramar con 24 horas o menos, contacta con Recepción.");
      }
      if (!["PENDING", "CONFIRMED"].includes(appointment.status) || appointment.clinicalRecord) throw new DomainError("La cita cambió de estado y no puede reprogramarse.", 409);
      if (appointment.cancellations.length) throw new DomainError("Resuelve la solicitud de cancelación antes de reprogramar esta cita.", 409);
      await this.requireFreeSlot(tx, appointment.dentistId, date, startTime, endTime, id, appointment.dentalUnitId);
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
