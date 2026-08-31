import { z } from "zod";

export const RoleSchema = z.enum(["PATIENT", "RECEPTIONIST", "DENTIST", "ADMIN"]);

export const AppointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

export const RegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  firstName: z.string().min(1, "Nombre es requerido"),
  lastName: z.string().min(1, "Apellido es requerido"),
  phone: z.string().optional(),
  role: RoleSchema.default("PATIENT"),
});

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña es requerida"),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export const RequestAppointmentSchema = z.object({
  dentistId: z.string().uuid("ID de odontólogo inválido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora debe ser HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora debe ser HH:MM"),
  notes: z.string().optional(),
});

export const RescheduleAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora debe ser HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora debe ser HH:MM"),
});

export const AppointmentStatusUpdateSchema = z.object({
  status: z.enum(["COMPLETED", "NO_SHOW"]),
});

export const RejectAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const CreateClinicalRecordSchema = z.object({
  patientId: z.string().uuid("ID de paciente inválido"),
  appointmentId: z.string().uuid("ID de cita inválido"),
  notes: z.string().min(1, "Las notas son requeridas"),
});

export const ConfigureAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora debe ser HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora debe ser HH:MM"),
});

export const AddScheduleExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
  reason: z.string().optional(),
});

export const CreateDentistSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido"),
  specialty: z.string().min(1, "Especialidad es requerida"),
});

export const UpdateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  generalHours: z.string().optional(),
});

export const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
  dentistId: z.string().uuid().optional(),
});

// --- Business Rules ---

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;

export function canCancelOrReschedule(appointmentDate: Date, now: Date = new Date()): boolean {
  return appointmentDate.getTime() - now.getTime() >= HOURS_24_IN_MS;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return endMinutes > startMinutes;
}

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type RequestAppointmentInput = z.infer<typeof RequestAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentSchema>;
export type CreateClinicalRecordInput = z.infer<typeof CreateClinicalRecordSchema>;
export type ConfigureAvailabilityInput = z.infer<typeof ConfigureAvailabilitySchema>;
export type AddScheduleExceptionInput = z.infer<typeof AddScheduleExceptionSchema>;
export type CreateDentistInput = z.infer<typeof CreateDentistSchema>;
export type UpdateClinicInput = z.infer<typeof UpdateClinicSchema>;
export type DateRangeInput = z.infer<typeof DateRangeSchema>;
