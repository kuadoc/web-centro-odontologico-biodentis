import { AppointmentRepository } from "../domain/AppointmentRepository";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { DomainError } from "../../../shared/errors/DomainError";
import { isValidTransition, AppointmentStatus } from "../domain/AppointmentStatus";

export class ConfirmAppointmentUseCase {
  constructor(private appointmentRepo: AppointmentRepository) {}

  async execute(appointmentId: string) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Cita");
    }

    if (!isValidTransition(appointment.status, AppointmentStatus.CONFIRMED)) {
      throw new DomainError(
        `No se puede confirmar una cita en estado '${appointment.status}'`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    return this.appointmentRepo.updateStatus(appointmentId, AppointmentStatus.CONFIRMED);
  }
}
