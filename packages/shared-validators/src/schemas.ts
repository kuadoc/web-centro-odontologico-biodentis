import { z } from "zod";
import { RoleSchema, AppointmentStatusSchema } from "./enums";

export const RegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  phone: z.string().optional(),
  role: RoleSchema.default("PATIENT"),
});

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const RequestAppointmentSchema = z.object({
  dentistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});

export const RescheduleAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const AppointmentStatusUpdateSchema = z.object({
  status: AppointmentStatusSchema.refine((val) => ["COMPLETED", "NO_SHOW"].includes(val), {
    message: "Solo se puede cambiar a COMPLETED o NO_SHOW",
  }),
});

export const CreateClinicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  notes: z.string().min(1, "Notas requeridas"),
});

export const ConfigureAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const AddScheduleExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export const UpdateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  generalHours: z.string().optional(),
});

export const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dentistId: z.string().uuid().optional(),
});
