import { AppointmentRepository } from "../domain/AppointmentRepository";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { DomainError } from "../../../shared/errors/DomainError";
import { AuthorizationError } from "../../../shared/errors/AuthorizationError";
import { isValidTransition, AppointmentStatus } from "../domain/AppointmentStatus";

export class MarkAppointmentStatusUseCase {
  constructor(private appointmentRepo: AppointmentRepository) {}

  async execute(appointmentId: string, status: AppointmentStatus, dentistId: string) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Cita");
    }

    if (appointment.dentistId !== dentistId) {
      throw new AuthorizationError("No puedes modificar una cita que no es tuya");
    }

    if (!isValidTransition(appointment.status, status)) {
      throw new DomainError(
        `No se puede cambiar de '${appointment.status}' a '${status}'`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    return this.appointmentRepo.updateStatus(appointmentId, status);
  }
}
