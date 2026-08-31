import { AppointmentRepository } from "../domain/AppointmentRepository";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { DomainError } from "../../../shared/errors/DomainError";
import { canCancelOrReschedule } from "../domain/rules/canCancelOrReschedule";
import { isValidTransition, AppointmentStatus } from "../domain/AppointmentStatus";

export class CancelAppointmentUseCase {
  constructor(private appointmentRepo: AppointmentRepository) {}

  async execute(appointmentId: string, patientId: string) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Cita");
    }

    if (appointment.patientId !== patientId) {
      throw new DomainError("No puedes cancelar una cita que no es tuya", "NOT_YOUR_APPOINTMENT");
    }

    if (!isValidTransition(appointment.status, AppointmentStatus.CANCELLED)) {
      throw new DomainError(
        `No se puede cancelar una cita en estado '${appointment.status}'`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
      throw new DomainError(
        "No se puede cancelar una cita con menos de 24 horas de anticipación",
        "CANCEL_TOO_LATE"
      );
    }

    return this.appointmentRepo.updateStatus(appointmentId, AppointmentStatus.CANCELLED);
  }
}
