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
  patientId: z.string().uuid().optional(),
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

export const CreatePatientSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const UpdatePatientSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido").optional(),
  lastName: z.string().min(1, "Apellido requerido").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
  auditReason: z.string().min(15, "Mínimo 15 caracteres para auditoría").optional(),
});

export const DeactivatePatientSchema = z.object({
  reason: z.string().min(1, "Motivo requerido"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// ─── Perfil (Mi Perfil) ────────────────────────────────────────
const phoneField = z
  .string()
  .trim()
  .min(6, "Teléfono demasiado corto")
  .max(25, "Teléfono demasiado largo")
  .regex(/^[+()\d\s-]+$/, "Teléfono inválido");

/**
 * Foto de perfil: o un data URL de imagen (el recorte que genera el navegador)
 * o una URL http(s) si algun dia se usa almacenamiento externo.
 *
 * El limite de 512 KB deja holgura sobre los ~20 KB que produce el recorte a
 * 256x256 e impide que alguien meta un archivo enorme en la fila del usuario.
 */
const AVATAR_MAX_CHARS = 512 * 1024;

const avatarField = z
  .string()
  .max(AVATAR_MAX_CHARS, "La imagen es demasiado grande")
  .refine(
    (value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https?:\/\//.test(value),
    "Formato de imagen no válido"
  );

export const UpdateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, "Nombre requerido").optional(),
    lastName: z.string().trim().min(1, "Apellido requerido").optional(),
    phone: phoneField.or(z.literal("")).nullable().optional(),
    secondaryPhone: phoneField.or(z.literal("")).nullable().optional(),
    address: z.string().trim().max(200).or(z.literal("")).nullable().optional(),
    avatarUrl: avatarField.or(z.literal("")).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay campos para actualizar",
  });

export const UpdatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Mínimo 8 caracteres").optional(),
  })
  .refine((data) => data.confirmPassword === undefined || data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña debe ser distinta a la actual",
    path: ["newPassword"],
  });

export const UpdateDentistProfileSchema = z.object({
  specialty: z.string().trim().min(1).optional(),
  licenseNumber: z.string().trim().max(50).or(z.literal("")).nullable().optional(),
  university: z.string().trim().max(120).or(z.literal("")).nullable().optional(),
  shiftLabel: z.string().trim().max(60).or(z.literal("")).nullable().optional(),
  assignedUnitId: z.string().uuid("Unidad inválida").nullable().optional(),
});
