export enum Role {
  PATIENT = "PATIENT",
  RECEPTIONIST = "RECEPTIONIST",
  DENTIST = "DENTIST",
  ADMIN = "ADMIN",
}

export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
  CANCELLED = "CANCELLED",
}

export enum DentalUnitType {
  SILLON = "SILLON",
  QUIRURGICO = "QUIRURGICO",
  RADIOLOGICO = "RADIOLOGICO",
}

export enum DentalUnitStatus {
  ACTIVE = "ACTIVE",
  MAINTENANCE = "MAINTENANCE",
  INACTIVE = "INACTIVE",
}

export enum ExceptionScope {
  DENTIST = "DENTIST",
  CLINIC = "CLINIC",
  UNIT = "UNIT",
}

export enum ExceptionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export enum SettingType {
  NUMBER = "NUMBER",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
}

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dentist {
  id: string;
  userId: string;
  specialty: string;
  user: User;
}

export interface Availability {
  id: string;
  dentistId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleException {
  id: string;
  dentistId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  scope: ExceptionScope;
  status: ExceptionStatus;
}

export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: User;
  dentist?: Dentist;
}

export interface ClinicalRecord {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  patient?: User;
  dentist?: Dentist;
}

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  generalHours: string | null;
  email: string | null;
  rut: string | null;
  website: string | null;
  logoUrl: string | null;
}

export interface DentalUnit {
  id: string;
  name: string;
  type: DentalUnitType;
  status: DentalUnitStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: SettingType;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
