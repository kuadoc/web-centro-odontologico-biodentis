import { AppointmentRepository } from "../domain/AppointmentRepository";
import { AvailabilityService } from "../../dentists/domain/AvailabilityService";
import { RequestAppointmentInput } from "@biodentis/shared-validators";
import { ScheduleConflictError } from "../../../shared/errors/ScheduleConflictError";
import { DomainError } from "../../../shared/errors/DomainError";
import { validateSlotAvailability } from "../domain/rules/validateSlotAvailability";

export class RequestAppointmentUseCase {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private availabilityService: AvailabilityService
  ) {}

  async execute(patientId: string, input: RequestAppointmentInput) {
    const date = new Date(input.date);

    const availableSlots = await this.availabilityService.getAvailableSlots(input.dentistId, input.date);

    if (!validateSlotAvailability(input.startTime, input.endTime, availableSlots)) {
      throw new ScheduleConflictError("El odontólogo no tiene disponibilidad en ese horario");
    }

    const hasConflict = await this.appointmentRepo.hasConflict(
      input.dentistId,
      date,
      input.startTime
    );
    if (hasConflict) {
      throw new DomainError("El horario ya está ocupado", "SLOT_OCCUPIED");
    }

    const appointment = await this.appointmentRepo.create({
      patientId,
      dentistId: input.dentistId,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
    });

    return appointment;
  }
}
