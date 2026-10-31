import type { PublicServiceCatalog } from "@biodentis/shared-types"
import { ServiceCatalogRepository } from "./service-catalog.repository"

// Las categorías del catálogo describen procedimientos; no asignan un odontólogo.
const specialtyByCategory: Record<string, string> = {
  diagnostico: "Odontología General",
  higiene: "Odontología General",
  restauracion: "Odontología General",
  general: "Odontología General",
  "odontologia general": "Odontología General",
  ortodoncia: "Ortodoncia",
  endodoncia: "Endodoncia",
  cirugia: "Cirugía Maxilofacial",
  "cirugia maxilofacial": "Cirugía Maxilofacial",
  implantes: "Prótesis y Rehabilitación",
  rehabilitacion: "Prótesis y Rehabilitación",
  "protesis y rehabilitacion": "Prótesis y Rehabilitación",
  periodoncia: "Periodoncia",
  odontopediatria: "Odontopediatría",
  radiologia: "Radiología Dental",
  "radiologia dental": "Radiología Dental",
  estetica: "Estética Dental",
  "estetica dental": "Estética Dental",
}

export class ServiceCatalogService {
  constructor(private readonly repository = new ServiceCatalogRepository()) {}

  async getPublicCatalog(): Promise<PublicServiceCatalog> {
    const treatments = await this.repository.findActive()

    return {
      // Misma moneda que los precios de lista y los ingresos del panel de BIODENTIS.
      currency: "PEN",
      services: treatments.map((treatment) => {
        const category = treatment.category.trim()
        const key = category
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
        const price = Number(treatment.price)

        return {
          id: treatment.id,
          name: treatment.name,
          category,
          specialty:
            treatment.specialty?.name ??
            specialtyByCategory[key] ??
            (category || "Odontología General"),
          description: treatment.description,
          price:
            treatment.price !== null && Number.isFinite(price) && price >= 0
              ? price
              : null,
          durationMinutes:
            Number.isInteger(treatment.durationMinutes) &&
            treatment.durationMinutes > 0
              ? treatment.durationMinutes
              : null,
        }
      }),
    }
  }
}
