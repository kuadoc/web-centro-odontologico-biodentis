import { PrismaClient } from "@prisma/client";
import {
  ClinicalRecordRepository,
  ClinicalRecordData,
  ClinicalRecordWithRelations,
} from "../domain/ClinicalRecordRepository";
import { Role } from "@biodentis/shared-types";
import { AuthorizationError } from "../../../shared/errors/AuthorizationError";

const prisma = new PrismaClient();

export class PrismaClinicalRecordRepository implements ClinicalRecordRepository {
  async findByPatientId(
    patientId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<ClinicalRecordWithRelations[]> {
    if (requesterRole === Role.RECEPTIONIST || requesterRole === Role.ADMIN) {
      throw new AuthorizationError("Acceso denegado al historial clínico");
    }

    const where: any = { patientId };

    if (requesterRole === Role.DENTIST) {
      where.dentistId = requesterId;
    } else if (requesterRole === Role.PATIENT && requesterId !== patientId) {
      return [];
    }

    const records = await prisma.clinicalRecord.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        dentist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records as ClinicalRecordWithRelations[];
  }

  async create(data: {
    patientId: string;
    dentistId: string;
    appointmentId: string;
    notes: string;
  }): Promise<ClinicalRecordData> {
    const record = await prisma.clinicalRecord.create({ data });
    return record as ClinicalRecordData;
  }

  async logAccess(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: { userId, action, resourceType, resourceId, details },
    });
  }
}
