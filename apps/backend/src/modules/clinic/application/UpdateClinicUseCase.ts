import { ClinicRepository } from "../domain/ClinicRepository";
import { UpdateClinicInput } from "@biodentis/shared-validators";

export class UpdateClinicUseCase {
  constructor(private clinicRepo: ClinicRepository) {}

  async execute(input: UpdateClinicInput) {
    return this.clinicRepo.update(input);
  }
}
