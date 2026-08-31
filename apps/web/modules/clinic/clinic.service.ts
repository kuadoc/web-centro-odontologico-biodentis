import { ClinicRepository } from "./clinic.repository";
import { UpdateClinicSchema } from "@workspace/shared-validators";
import { NotFoundError } from "@/lib/errors";

const clinicRepository = new ClinicRepository();

export class ClinicService {
  async get() {
    let clinic = await clinicRepository.findFirst();
    if (!clinic) {
      clinic = await clinicRepository.create({ name: "BIODENTIS" });
    }
    return clinic;
  }

  async update(data: unknown) {
    const parsed = UpdateClinicSchema.parse(data);
    const clinic = await clinicRepository.findFirst();
    if (!clinic) throw new NotFoundError("Clínica no encontrada");
    return clinicRepository.update(clinic.id, parsed);
  }
}
