import { ClinicalRecordRepository } from "./clinical-record.repository";
import { CreateClinicalRecordSchema } from "@biodentis/shared-validators";
import { NotFoundError, DomainError } from "@/lib/errors";

const clinicalRecordRepository = new ClinicalRecordRepository();

export class ClinicalRecordService {
  async getByPatient(patientId: string) {
    return clinicalRecordRepository.findByPatientId(patientId);
  }

  async getById(id: string) {
    const record = await clinicalRecordRepository.findById(id);
    if (!record) throw new NotFoundError("Historial clínico no encontrado");
    return record;
  }

  async create(data: unknown, dentistId: string) {
    const parsed = CreateClinicalRecordSchema.parse(data);

    const existing = await clinicalRecordRepository.findById(parsed.appointmentId);
    if (existing) {
      throw new DomainError("Ya existe un historial clínico para esta cita");
    }

    return clinicalRecordRepository.create({
      patientId: parsed.patientId,
      dentistId,
      appointmentId: parsed.appointmentId,
      notes: parsed.notes,
    });
  }

  async update(id: string, notes: string) {
    const record = await clinicalRecordRepository.findById(id);
    if (!record) throw new NotFoundError("Historial clínico no encontrado");
    return clinicalRecordRepository.update(id, { notes });
  }
}
