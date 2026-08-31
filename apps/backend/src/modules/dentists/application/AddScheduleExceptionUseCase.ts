import { DentistRepository } from "../domain/DentistRepository";
import { AddScheduleExceptionInput } from "@biodentis/shared-validators";

export class AddScheduleExceptionUseCase {
  constructor(private dentistRepo: DentistRepository) {}

  async execute(dentistId: string, input: AddScheduleExceptionInput) {
    const date = new Date(input.date);
    return this.dentistRepo.addScheduleException(dentistId, date, input.reason);
  }
}
