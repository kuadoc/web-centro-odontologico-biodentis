import { DentistRepository } from "../domain/DentistRepository";

export class GetDentistsUseCase {
  constructor(private dentistRepo: DentistRepository) {}

  async execute() {
    return this.dentistRepo.findAll();
  }
}
