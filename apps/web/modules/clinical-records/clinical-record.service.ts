import { ClinicalRecordRepository } from "./clinical-record.repository";
import { CreateClinicalRecordSchema } from "@biodentis/shared-validators";
import { NotFoundError } from "@/lib/errors";

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

  async create(data: unknown, dentistUserId: string) {
    const parsed = CreateClinicalRecordSchema.parse(data);

    return clinicalRecordRepository.createForAppointment(parsed, dentistUserId);
  }

  async update(id: string, notes: string) {
    const record = await clinicalRecordRepository.findById(id);
    if (!record) throw new NotFoundError("Historial clínico no encontrado");
    return clinicalRecordRepository.update(id, { notes });
  }
}
