import { ClinicRepository } from "./clinic.repository";
import { UpdateClinicSchema } from "@biodentis/shared-validators";
import { NotFoundError } from "@/lib/errors";
import { clinicContact } from "@/lib/clinic-contact";
import { clinicLocation } from "@/lib/clinic-location";

const clinicRepository = new ClinicRepository();

export class ClinicService {
  async get() {
    let clinic = await clinicRepository.findFirst();
    if (!clinic) {
      clinic = await clinicRepository.create({ name: "BIODENTIS", phone: clinicContact.phone, address: clinicLocation.address });
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
