import { prisma } from "@/lib/prisma";

export class ClinicalRecordRepository {
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
