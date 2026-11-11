import { ClinicRepository } from "./clinic.repository";
import { UpdateClinicSchema } from "@biodentis/shared-validators";
import { NotFoundError } from "@/lib/errors";
import { clinicContact } from "@/lib/clinic-contact";
import { clinicLocation } from "@/lib/clinic-location";

export class ClinicService {
  constructor(private readonly clinicRepository = new ClinicRepository()) {}

  /** Datos institucionales publicados, sin configuración administrativa. */
  async getPublic() {
    const clinic = await this.get();
    const phone = clinic.phone?.trim() ?? "";
    const digits = phone.replace(/\D/g, "");
    const internationalPhone = digits ? `+${digits.length === 9 ? "51" : ""}${digits}` : "";
    const address = clinic.address?.trim() ?? "";
    return {
      name: clinic.name,
      address,
      phone,
      email: clinic.email?.trim() ?? "",
      internationalPhone,
      phoneHref: internationalPhone ? `tel:${internationalPhone}` : "",
      whatsapp: internationalPhone ? `https://wa.me/${internationalPhone.slice(1)}` : "",
      maps: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "",
    };
  }

  async get() {
    let clinic = await this.clinicRepository.findFirst();
    if (!clinic) {
      clinic = await this.clinicRepository.create({ name: "BIODENTIS", phone: clinicContact.phone, address: clinicLocation.address });
    }
    return clinic;
  }

  async update(data: unknown) {
    const parsed = UpdateClinicSchema.parse(data);
    const clinic = await this.clinicRepository.findFirst();
    if (!clinic) throw new NotFoundError("Clínica no encontrada");
    return this.clinicRepository.update(clinic.id, parsed);
  }
}
