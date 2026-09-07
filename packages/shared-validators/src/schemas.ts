import { z } from "zod";
import { RoleSchema, AppointmentStatusSchema, DentalUnitTypeSchema, DentalUnitStatusSchema, ExceptionScopeSchema, ExceptionStatusSchema, SettingTypeSchema } from "./enums";

export const RegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  phone: z.string().optional(),
  // role ELIMINADO — siempre PATIENT. Asignacion de roles via POST /api/users (admin only).
});

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
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

export const UpdateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  generalHours: z.string().optional(),
  email: z.string().email().optional(),
  rut: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

export const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dentistId: z.string().uuid().optional(),
});

export const CreateDentalUnitSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: DentalUnitTypeSchema,
  status: DentalUnitStatusSchema.default("ACTIVE"),
  description: z.string().optional(),
});

export const UpdateDentalUnitSchema = z.object({
  name: z.string().min(1).optional(),
  type: DentalUnitTypeSchema.optional(),
  status: DentalUnitStatusSchema.optional(),
  description: z.string().optional(),
});

export const CreateEmailTemplateSchema = z.object({
  key: z.string().min(1, "Clave requerida"),
  name: z.string().min(1, "Nombre requerido"),
  subject: z.string().min(1, "Asunto requerido"),
  body: z.string().min(1, "Cuerpo requerido"),
  isActive: z.boolean().default(true),
});

export const UpdateEmailTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateSystemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  type: SettingTypeSchema.default("STRING"),
});

export const BulkUpdateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1),
    value: z.string().min(1),
  })),
});

export const AddScheduleExceptionSchema = z.object({
  dentistId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
  scope: ExceptionScopeSchema.default("DENTIST"),
});

export const UpdateScheduleExceptionSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reason: z.string().optional(),
  scope: ExceptionScopeSchema.optional(),
  status: ExceptionStatusSchema.optional(),
});
