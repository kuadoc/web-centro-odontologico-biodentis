import { Role } from "@biodentis/shared-types";
import { AuthorizationError } from "../../../shared/errors/AuthorizationError";

export class AccessControlService {
  canViewClinicalRecord(
    requesterRole: Role,
    requesterId: string,
    patientId: string
  ): void {
    switch (requesterRole) {
      case Role.PATIENT:
        if (requesterId !== patientId) {
          throw new AuthorizationError("No puedes ver el historial clinico de otro paciente");
        }
        break;

      case Role.DENTIST:
        // Dentist can only see records of their own patients
        // This is checked at repository level with the query
        break;

      case Role.RECEPTIONIST:
        throw new AuthorizationError("Los recepcionistas no tienen acceso al historial clinico");

      case Role.ADMIN:
        throw new AuthorizationError("Los administradores no tienen acceso al historial clinico");

      default:
        throw new AuthorizationError("Rol no autorizado");
    }
  }

  canCreateClinicalRecord(requesterRole: Role): void {
    if (requesterRole !== Role.DENTIST) {
      throw new AuthorizationError("Solo los odontologos pueden crear historiales clinicos");
    }
  }
}
