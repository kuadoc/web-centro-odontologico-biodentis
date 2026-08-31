import { ClinicalRecordRepository } from "../domain/ClinicalRecordRepository";
import { AccessControlService } from "../domain/AccessControlService";
import { Role } from "@biodentis/shared-types";

export class GetClinicalRecordsUseCase {
  constructor(
    private clinicalRecordRepo: ClinicalRecordRepository,
    private accessControl: AccessControlService
  ) {}

  async execute(
    patientId: string,
    requesterId: string,
    requesterRole: Role
  ) {
    this.accessControl.canViewClinicalRecord(requesterRole, requesterId, patientId);

    const records = await this.clinicalRecordRepo.findByPatientId(
      patientId,
      requesterId,
      requesterRole
    );

    await this.clinicalRecordRepo.logAccess(
      requesterId,
      "VIEW_CLINICAL_RECORD",
      "ClinicalRecord",
      patientId,
      `Viewed records for patient ${patientId}`
    );

    return records;
  }
}
