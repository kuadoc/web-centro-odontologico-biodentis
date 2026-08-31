export interface DentistProfile {
  id: string;
  userId: string;
  specialty: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AvailabilitySlot {
  id: string;
  dentistId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleExceptionData {
  id: string;
  dentistId: string;
  date: Date;
  reason: string | null;
}

export interface DentistRepository {
  findById(id: string): Promise<DentistProfile | null>;
  findAll(): Promise<DentistProfile[]>;
  create(data: { userId: string; specialty: string }): Promise<DentistProfile>;
  getAvailability(dentistId: string): Promise<AvailabilitySlot[]>;
  setAvailability(dentistId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<AvailabilitySlot>;
  getScheduleExceptions(dentistId: string, date: Date): Promise<ScheduleExceptionData | null>;
  addScheduleException(dentistId: string, date: Date, reason?: string): Promise<ScheduleExceptionData>;
}
