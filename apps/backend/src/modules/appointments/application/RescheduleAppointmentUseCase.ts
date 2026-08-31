import { AppointmentRepository } from "../domain/AppointmentRepository";
import { AvailabilityService } from "../../dentists/domain/AvailabilityService";
import { RescheduleAppointmentInput } from "@biodentis/shared-validators";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { DomainError } from "../../../shared/errors/DomainError";
import { ScheduleConflictError } from "../../../shared/errors/ScheduleConflictError";
import { canCancelOrReschedule } from "../domain/rules/canCancelOrReschedule";
import { validateSlotAvailability } from "../domain/rules/validateSlotAvailability";

export class RescheduleAppointmentUseCase {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private availabilityService: AvailabilityService
  ) {}

  async execute(appointmentId: string, input: RescheduleAppointmentInput, requesterRole: string) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Cita");
    }

    if (requesterRole === "PATIENT") {
      if (!canCancelOrReschedule(appointment.date, appointment.startTime)) {
        throw new DomainError(
          "No se puede reprogramar una cita con menos de 24 horas de anticipación",
          "RESCHEDULE_TOO_LATE"
        );
      }
    }

    const newDate = new Date(input.date);
    const availableSlots = await this.availabilityService.getAvailableSlots(
      appointment.dentistId,
      input.date
    );

    if (!validateSlotAvailability(input.startTime, input.endTime, availableSlots)) {
      throw new ScheduleConflictError("El odontólogo no tiene disponibilidad en ese horario");
    }

    const hasConflict = await this.appointmentRepo.hasConflict(
      appointment.dentistId,
      newDate,
      input.startTime,
      appointmentId
    );
    if (hasConflict) {
      throw new DomainError("El horario ya está ocupado", "SLOT_OCCUPIED");
    }

    return this.appointmentRepo.updateSchedule(appointmentId, newDate, input.startTime, input.endTime);
  }
}
