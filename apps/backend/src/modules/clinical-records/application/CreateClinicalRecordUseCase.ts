import { ClinicalRecordRepository } from "../domain/ClinicalRecordRepository";
import { AccessControlService } from "../domain/AccessControlService";
import { CreateClinicalRecordInput } from "@biodentis/shared-validators";
import { Role } from "@biodentis/shared-types";
import { DomainError } from "../../../shared/errors/DomainError";

export class CreateClinicalRecordUseCase {
  constructor(
    private clinicalRecordRepo: ClinicalRecordRepository,
    private accessControl: AccessControlService
  ) {}

  async execute(dentistId: string, input: CreateClinicalRecordInput) {
    this.accessControl.canCreateClinicalRecord(Role.DENTIST);

    const existingRecords = await this.clinicalRecordRepo.findByPatientId(
      input.patientId,
      dentistId,
      Role.DENTIST
    );

    const existingForAppointment = existingRecords.find(
      (r) => r.appointmentId === input.appointmentId
    );
    if (existingForAppointment) {
      throw new DomainError(
        "Ya existe un historial clínico para esta cita",
        "CLINICAL_RECORD_EXISTS"
      );
    }

    const record = await this.clinicalRecordRepo.create({
      patientId: input.patientId,
      dentistId,
      appointmentId: input.appointmentId,
      notes: input.notes,
    });

    await this.clinicalRecordRepo.logAccess(
      dentistId,
      "CREATE_CLINICAL_RECORD",
      "ClinicalRecord",
      record.id,
      `Created record for patient ${input.patientId}`
    );

    return record;
  }
}
