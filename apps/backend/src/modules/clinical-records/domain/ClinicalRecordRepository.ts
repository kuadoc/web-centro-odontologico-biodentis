export interface ClinicalRecordData {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicalRecordWithRelations extends ClinicalRecordData {
  patient: { id: string; firstName: string; lastName: string; email: string };
  dentist: { id: string; specialty: string; user: { firstName: string; lastName: string } };
}

export interface ClinicalRecordRepository {
  findByPatientId(patientId: string, requesterId: string, requesterRole: string): Promise<ClinicalRecordWithRelations[]>;
  create(data: { patientId: string; dentistId: string; appointmentId: string; notes: string }): Promise<ClinicalRecordData>;
  logAccess(userId: string, action: string, resourceType: string, resourceId: string, details?: string): Promise<void>;
}
