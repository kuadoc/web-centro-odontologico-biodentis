import { Role } from "@biodentis/shared-types";
import { AuthorizationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export class AccessControlService {
  async canViewClinicalRecord(requesterRole: Role, requesterId: string, patientId: string): Promise<void> {
    switch (requesterRole) {
      case Role.PATIENT:
        // Paciente SOLO puede ver sus propios registros
        if (requesterId !== patientId) {
          throw new AuthorizationError("No puedes ver el historial de otro paciente");
        }
        break;

      case Role.DENTIST:
        // Odontologo solo puede ver pacientes con quienes tiene citas asignadas
        const hasAppointments = await prisma.appointment.findFirst({
          where: { dentist: { userId: requesterId }, patientId, status: "COMPLETED" },
        });
        if (!hasAppointments) {
          throw new AuthorizationError("No tienes citas con este paciente");
        }
        break;

      case Role.ADMIN:
        // Admin tiene acceso total — sin restriccion
        break;

      case Role.RECEPTIONIST:
        throw new AuthorizationError("Recepcionistas no tienen acceso al historial clinico");

      default:
        throw new AuthorizationError("Rol no autorizado");
    }
  }

  canCreateClinicalRecord(requesterRole: Role): void {
    if (requesterRole !== Role.DENTIST) {
      throw new AuthorizationError("Solo odontologos pueden crear historiales clinicos");
    }
  }
}
