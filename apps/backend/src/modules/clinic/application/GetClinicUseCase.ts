import { ClinicRepository } from "../domain/ClinicRepository";

export class GetClinicUseCase {
  constructor(private clinicRepo: ClinicRepository) {}

  async execute() {
    return this.clinicRepo.find();
  }
}
