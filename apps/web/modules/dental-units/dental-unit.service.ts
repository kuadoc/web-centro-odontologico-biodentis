import { DentalUnitRepository } from "./dental-unit.repository";
import { CreateDentalUnitSchema, UpdateDentalUnitSchema } from "@biodentis/shared-validators";
import { NotFoundError } from "@/lib/errors";
import type { DentalUnitType, DentalUnitStatus } from "@biodentis/shared-types";

const dentalUnitRepository = new DentalUnitRepository();

export class DentalUnitService {
  async getAll(type?: string, status?: string) {
    if (type) return dentalUnitRepository.findByType(type as DentalUnitType);
    if (status) return dentalUnitRepository.findByStatus(status as DentalUnitStatus);
    return dentalUnitRepository.findAll();
  }

  async getById(id: string) {
    const unit = await dentalUnitRepository.findById(id);
    if (!unit) throw new NotFoundError("Unidad dental no encontrada");
    return unit;
  }

  async getStats() {
    return dentalUnitRepository.countByStatus();
  }

  async create(data: unknown) {
    const parsed = CreateDentalUnitSchema.parse(data);
    return dentalUnitRepository.create({
      name: parsed.name,
      type: parsed.type as DentalUnitType,
      status: parsed.status as DentalUnitStatus,
      description: parsed.description,
    });
  }

  async update(id: string, data: unknown) {
    await this.getById(id);
    const parsed = UpdateDentalUnitSchema.parse(data);
    return dentalUnitRepository.update(id, {
      name: parsed.name,
      type: parsed.type as DentalUnitType | undefined,
      status: parsed.status as DentalUnitStatus | undefined,
      description: parsed.description,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return dentalUnitRepository.delete(id);
  }
}
