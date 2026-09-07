import { DentistRepository } from "./dentist.repository";
import { NotFoundError } from "@/lib/errors";

const dentistRepository = new DentistRepository();

export class DentistService {
  async getAll() {
    return dentistRepository.findAll();
  }

  async getById(id: string) {
    const dentist = await dentistRepository.findById(id);
    if (!dentist) throw new NotFoundError("Odontólogo no encontrado");
    return dentist;
  }

  async getByUserId(userId: string) {
    return dentistRepository.findByUserId(userId);
  }

  async getBySpecialty(specialty: string) {
    return dentistRepository.findBySpecialty(specialty);
  }
}
