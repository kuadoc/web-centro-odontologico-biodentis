import { prisma } from "@/lib/prisma";
import { AuthorizationError, DomainError, NotFoundError } from "@/lib/errors";
import { withScheduleTransaction } from "@/modules/appointments/schedule-transaction.repository";
import { AuditRepository } from "@/modules/audit/audit.repository";
import { AuditService } from "@/modules/audit/audit.service";

export class ClinicalRecordRepository {
  createForAppointment(data: { patientId: string; appointmentId: string; notes: string }, actorId: string) {
    return withScheduleTransaction(prisma, async (tx) => {
      const dentist = await tx.dentist.findUnique({ where: { userId: actorId }, include: { user: { select: { role: true, isActive: true } } } });
      if (!dentist || !dentist.user.isActive || dentist.user.role !== "DENTIST") throw new AuthorizationError("Solo un odontólogo activo puede registrar notas clínicas.");
      const appointment = await tx.appointment.findUnique({ where: { id: data.appointmentId }, include: { clinicalRecord: { select: { id: true } } } });
      if (!appointment) throw new NotFoundError("Cita no encontrada");
      if (appointment.dentistId !== dentist.id || appointment.patientId !== data.patientId) throw new AuthorizationError("La cita no corresponde al paciente y odontólogo indicados.");
      if (appointment.status !== "COMPLETED") throw new DomainError("La cita debe estar atendida antes de registrar esta nota.", 409);
      if (appointment.clinicalRecord) throw new DomainError("La cita ya tiene una nota clínica.", 409);
      const record = await tx.clinicalRecord.create({ data: { ...data, dentistId: dentist.id } });
      await new AuditService(new AuditRepository(tx)).log(actorId, "CREATE_CLINICAL_RECORD", "Appointment", appointment.id, "Nota clínica del odontólogo asignado.");
      return record;
    });
  }
  async findByPatientId(patientId: string) {
    return prisma.clinicalRecord.findMany({
      where: { patientId },
      include: {
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
        appointment: { select: { date: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.clinicalRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
        appointment: { select: { date: true, startTime: true, endTime: true } },
      },
    });
  }

  async create(data: { patientId: string; dentistId: string; appointmentId: string; notes: string }) {
    return prisma.clinicalRecord.create({ data });
  }

  async update(id: string, data: { notes: string }) {
    return prisma.clinicalRecord.update({ where: { id }, data });
  }
}
