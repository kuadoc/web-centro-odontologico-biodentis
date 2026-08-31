import { Role } from "@workspace/shared-validators";
import { AuthorizationError } from "@/lib/errors";

export class AccessControlService {
  canViewClinicalRecord(requesterRole: Role, requesterId: string, patientId: string): void {
    switch (requesterRole) {
      case Role.PATIENT:
        if (requesterId !== patientId) {
          throw new AuthorizationError("No puedes ver el historial de otro paciente");
        }
        break;
      case Role.DENTIST:
        break;
      case Role.RECEPTIONIST:
        throw new AuthorizationError("Recepcionistas no tienen acceso al historial clínico");
      case Role.ADMIN:
        throw new AuthorizationError("Administradores no tienen acceso al historial clínico");
    }
  }

  canCreateClinicalRecord(requesterRole: Role): void {
    if (requesterRole !== Role.DENTIST) {
      throw new AuthorizationError("Solo odontólogos pueden crear historiales clínicos");
    }
  }
}
