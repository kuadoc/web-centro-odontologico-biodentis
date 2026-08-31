import { DentistRepository } from "../domain/DentistRepository";
import { ConfigureAvailabilityInput } from "@biodentis/shared-validators";

export class ConfigureAvailabilityUseCase {
  constructor(private dentistRepo: DentistRepository) {}

  async execute(dentistId: string, input: ConfigureAvailabilityInput) {
    return this.dentistRepo.setAvailability(
      dentistId,
      input.dayOfWeek,
      input.startTime,
      input.endTime
    );
  }
}
