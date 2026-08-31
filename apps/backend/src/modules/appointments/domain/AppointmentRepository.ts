import { AppointmentStatus } from "@biodentis/shared-types";

export interface AppointmentData {
  id: string;
  patientId: string;
  dentistId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentWithRelations extends AppointmentData {
  patient: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  dentist: { id: string; specialty: string; user: { firstName: string; lastName: string } };
}

export interface AppointmentRepository {
  findById(id: string): Promise<AppointmentWithRelations | null>;
  findByPatientId(patientId: string): Promise<AppointmentWithRelations[]>;
  findByDentistId(dentistId: string, date?: Date): Promise<AppointmentWithRelations[]>;
  findAll(filters?: { from?: Date; to?: Date; dentistId?: string }): Promise<AppointmentWithRelations[]>;
  create(data: {
    patientId: string;
    dentistId: string;
    date: Date;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<AppointmentData>;
  updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentData>;
  updateSchedule(id: string, date: Date, startTime: string, endTime: string): Promise<AppointmentData>;
  hasConflict(dentistId: string, date: Date, startTime: string, excludeId?: string): Promise<boolean>;
}
