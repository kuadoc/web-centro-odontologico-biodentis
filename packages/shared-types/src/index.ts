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
  dni?: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  avatarUrl: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Dentist {
  id: string;
  userId: string;
  specialty: string;
  licenseNumber: string | null;
  university: string | null;
  shiftLabel: string | null;
  assignedUnitId: string | null;
  user: User;
}

/** Datos profesionales publicados en la landing; excluye información privada. */
export interface PublicDentist {
  id: string;
  specialty: string;
  licenseNumber: string | null;
  university: string | null;
  user: Pick<User, "firstName" | "lastName" | "avatarUrl">;
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
  treatment?: { id: string; name: string; category: string; specialty?: { name: string } | null } | null;
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
  /** Nota clínica post-atención (solo si la cita ya tiene registro). */
  clinicalRecord?: { notes: string } | null;
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

// ─── Perfil (Mi Perfil) ────────────────────────────────────────
export interface WeeklyScheduleDay {
  dayOfWeek: number;
  dayName: string;
  startTime: string | null;
  endTime: string | null;
  unitName: string | null;
  available: boolean;
  hours: number;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface DentistProfile {
  id: string;
  specialty: string;
  licenseNumber: string | null;
  university: string | null;
  shiftLabel: string | null;
  assignedUnit: { id: string; name: string } | null;
}

export interface MyProfile {
  user: User;
  dentist: DentistProfile | null;
  schedule: WeeklyScheduleDay[];
  weeklyHours: number;
  upcomingException: ScheduleException | null;
}

// ─── Dashboard ─────────────────────────────────────────────────
export enum AppointmentPriority {
  NORMAL = "NORMAL",
  URGENT = "URGENT",
  EMERGENCY = "EMERGENCY",
}

export enum WaitingStatus {
  NOT_ARRIVED = "NOT_ARRIVED",
  WAITING = "WAITING",
  TRIAGE = "TRIAGE",
  IN_CHAIR = "IN_CHAIR",
  DONE = "DONE",
}

export enum TreatmentPlanStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Treatment {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  description: string | null;
  isActive: boolean;
}

export interface InventoryAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  unit: string;
}

/** Fila de la agenda del dashboard: cita aplanada con todo lo que la tabla muestra. */
export interface AgendaRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  waitingStatus: WaitingStatus;
  checkInAt: string | null;
  calledAt: string | null;
  notes: string | null;
  sessionNumber: number | null;
  patient: {
    id: string;
    fullName: string;
    patientCode: string | null;
    avatarUrl: string | null;
  };
  dentist: { id: string; fullName: string };
  treatment: { id: string; name: string; category: string; price: number } | null;
  dentalUnit: { id: string; name: string; type: DentalUnitType } | null;
  plan: { id: string; totalSessions: number; completedSessions: number } | null;
}

export interface WaitingRoomRow extends AgendaRow {
  waitedMinutes: number;
}

export interface DashboardOverview {
  date: string;
  appointments: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    noShow: number;
    changeVsYesterday: number | null;
  };
  attendance: {
    attended: number;
    scheduled: number;
    percent: number;
    patientsPerHour: number;
  };
  treatments: {
    active: number;
    byCategory: Array<{ category: string; count: number }>;
  };
  revenue: {
    estimated: number;
    goal: number;
    percentOfGoal: number;
    changeVsYesterday: number | null;
  };
  inventoryAlerts: InventoryAlert[];
}

export interface DashboardAgenda {
  items: AgendaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Pacientes (directorio administrativo) ─────────────────────
export interface PatientRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  address: string | null;
  avatarUrl: string | null;
  patientCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  appointmentCount: number;
}

export interface PatientList {
  items: PatientRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PatientStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

/** Metricas de agenda, deliberadamente sin datos clinicos. */
export interface PatientActivity {
  totalAppointments: number;
  attended: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  lastAttendedAt: string | null;
}

export interface PatientHistoryRow {
  id: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  dentistName: string;
  treatmentName: string | null;
}

export interface PatientDetail {
  /** Sin `appointmentCount`: el detalle trae el desglose completo en `activity`. */
  patient: Omit<PatientRow, "appointmentCount">;
  activity: PatientActivity;
  history: PatientHistoryRow[];
}

/** Catálogo público: solo información comercial, sin pacientes ni personal. */
export interface PublicService {
  id: string;
  name: string;
  category: string;
  specialty: string;
  description: string | null;
  price: number | null;
  durationMinutes: number | null;
}

export interface PublicServiceCatalog {
  currency: "PEN";
  services: PublicService[];
}

export interface CatalogDentist {
  id: string;
  name: string;
}

export interface CatalogService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  isActive: boolean;
}

export interface CatalogSpecialty {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  dentists: CatalogDentist[];
  services: CatalogService[];
  futureAppointments: number;
}

export interface AdminServiceCatalog {
  specialties: CatalogSpecialty[];
  dentists: CatalogDentist[];
}

export interface BookingSpecialty {
  id: string;
  name: string;
  dentists: CatalogDentist[];
  services: CatalogService[];
}
