import { z } from "zod";
import { RoleSchema, AppointmentStatusSchema, DentalUnitTypeSchema, DentalUnitStatusSchema, ExceptionScopeSchema, ExceptionStatusSchema, SettingTypeSchema } from "./enums";

const storageUuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const StorageDriverSchema = z.enum(["local", "s3"]);
export const GuardarImagenCarpetaSchema = z.string().regex(
  new RegExp(`^(?:odontologos|avatares/${storageUuid})$`),
  "La carpeta debe ser odontologos o avatares/<UUID del propietario>",
);
export const ImagenStorageClaveSchema = z.string().max(160).regex(
  new RegExp(`^(?:odontologos|avatares/${storageUuid})/${storageUuid}(?:-thumb)?\\.webp$`),
  "La clave de la imagen no es válida",
);
export const GuardarImagenArchivoSchema = z.instanceof(File, { error: "Adjunta un archivo de imagen válido" })
  .refine((file) => file.size > 0, "La imagen está vacía")
  .refine((file) => file.size <= 5 * 1024 * 1024, "La imagen supera el máximo de 5 MB");

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
  treatmentId: z.string().uuid().optional(),
  dentistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim()
    .pipe(z.string().min(10, "Escribe al menos 10 caracteres o deja las notas vacías.").or(z.literal("")))
    .transform((value) => value || undefined)
    .optional(),
  patientId: z.string().uuid().optional(),
});

export const CatalogIdSchema = z.string().uuid("Identificador no válido");
export const SaveSpecialtySchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre.").max(120, "Máximo 120 caracteres."),
  description: z.string().trim().max(1000, "Máximo 1000 caracteres.").default(""),
});
export const SaveCatalogServiceSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre.").max(200, "Máximo 200 caracteres."),
  durationMinutes: z.number().int().min(15, "Indica una duración de al menos 15 minutos.").max(720, "Máximo 720 minutos.")
    .multipleOf(15, "Debe ser múltiplo de 15."),
  price: z.number().min(0, "Precio no válido.").max(99999999.99, "Precio no válido.")
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Usa hasta dos decimales.").nullable(),
});
export const CatalogStateSchema = z.object({
  isActive: z.boolean(),
  confirm: z.boolean().default(false),
});
export const AssignSpecialtyDentistsSchema = z.object({
  dentistIds: z.array(z.string().uuid()).max(1000).refine((ids) => new Set(ids).size === ids.length, "Hay odontólogos repetidos."),
});

export const RescheduleAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const ReassignAppointmentSchema = z.object({
  dentistId: z.string().uuid("Selecciona un odontólogo válido"),
  reason: z.string().trim().min(15, "Describe el motivo con al menos 15 caracteres").max(2000, "Máximo 2000 caracteres"),
});

export const ReassignmentReportQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const CancellationReasonSchema = z.string().trim()
  .min(25, "Describe el motivo con al menos 25 caracteres")
  .max(2000, "Máximo 2000 caracteres");
export const CancelAppointmentSchema = z.object({ reason: CancellationReasonSchema });
export const RequestAppointmentCancellationSchema = CancelAppointmentSchema;
export const ReviewAppointmentCancellationSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: CancellationReasonSchema,
});
export const CancellationStateSchema = z.enum(["REQUESTED", "APPROVED", "REJECTED"]);
export const CancellationReportQuerySchema = ReassignmentReportQuerySchema.extend({ state: CancellationStateSchema.optional() });
export const CancellationActorSchema = z.object({ id: z.string().uuid(), name: z.string(), role: RoleSchema });
export const CancellationSnapshotSchema = z.object({
  appointmentId: z.string().uuid(),
  patient: z.object({ id: z.string().uuid(), name: z.string() }),
  dentist: z.object({ id: z.string().uuid(), name: z.string() }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(), endTime: z.string(),
  requestedBy: CancellationActorSchema,
});
export type CancellationReportItem = z.infer<typeof CancellationSnapshotSchema> & {
  id: string; state: z.infer<typeof CancellationStateSchema>; originalStatus: "PENDING" | "CONFIRMED";
  currentStatus: string; requestReason: string; reviewReason: string | null;
  reviewedBy: z.infer<typeof CancellationActorSchema> | null;
  createdAt: string; reviewedAt: string | null;
};
export type CancellationReport = {
  items: CancellationReportItem[]; total: number; page: number; pageSize: number;
  summary: { requested: number; approved: number; rejected: number; reassignments: number };
  activity: Array<{ month: string; requests: number; cancellations: number; reassignments: number }>;
};

export const ReassignmentAuditDetailSchema = z.object({
  appointmentId: z.string().uuid(),
  patient: z.object({ id: z.string().uuid(), name: z.string() }),
  previousDentist: z.object({ id: z.string().uuid(), name: z.string() }),
  newDentist: z.object({ id: z.string().uuid(), name: z.string() }),
  actor: z.object({ id: z.string().uuid(), name: z.string(), role: RoleSchema }),
  status: AppointmentStatusSchema.extract(["PENDING", "CONFIRMED"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().trim().min(15).max(2000),
});

export type ReassignmentAuditDetail = z.infer<typeof ReassignmentAuditDetailSchema>;
export type ReassignmentReport = {
  items: Array<ReassignmentAuditDetail & { id: string; createdAt: string }>;
  total: number;
  page: number;
  pageSize: number;
};

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

export const CompleteAppointmentSchema = z.object({
  diagnosis: z.string().trim().min(1, "El diagnóstico es requerido").max(2000),
  treatment: z.string().trim().min(1, "El tratamiento es requerido").max(2000),
  nextControl: z.enum(["none", "1m", "3m", "6m"]).optional(),
});

export const ConfigureAvailabilitySchema = z.object({
  dayOfWeek: z.number().int("El día debe ser un número entero").min(0).max(6),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Hora de inicio inválida"),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Hora de fin inválida"),
}).refine((day) => day.startTime < day.endTime, "La hora de fin debe ser posterior al inicio");

export const ReplaceWeeklyAvailabilitySchema = z.object({
  days: z
    .array(ConfigureAvailabilitySchema)
    .max(7, "Maximo 7 dias")
    .refine((d) => new Set(d.map((x) => x.dayOfWeek)).size === d.length, "Dias duplicados")
    .refine((d) => d.every((x) => x.startTime < x.endTime), "La hora de fin debe ser posterior al inicio"),
});

export const UpdateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  generalHours: z.string().optional(),
  email: z.string().trim().pipe(z.union([
    z.string().email("Ingresa un correo electrónico válido."),
    z.literal(""),
  ])).optional(),
  rut: z.string().optional(),
  website: z.string().trim().pipe(z.union([
    z.string().url("Ingresa una URL válida para el sitio web, por ejemplo https://biodentis.com."),
    z.literal(""),
  ])).optional(),
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

export const AddScheduleExceptionSchema = z
  .object({
    dentistId: z.string().uuid().optional(),
    dentalUnitId: z.string().uuid().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().optional(),
    scope: ExceptionScopeSchema.default("DENTIST"),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "DENTIST" && !val.dentistId) {
      ctx.addIssue({ code: "custom", path: ["dentistId"], message: "dentistId requerido para scope DENTIST" });
    }
    if (val.scope === "UNIT" && !val.dentalUnitId) {
      ctx.addIssue({ code: "custom", path: ["dentalUnitId"], message: "dentalUnitId requerido para scope UNIT" });
    }
  });

export const ListScheduleExceptionsQuerySchema = z.object({
  dentistId: z.string().uuid().optional(),
  dentalUnitId: z.string().uuid().optional(),
  scope: ExceptionScopeSchema.optional(),
  status: ExceptionStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const UpdateScheduleExceptionSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reason: z.string().optional(),
  scope: ExceptionScopeSchema.optional(),
  status: ExceptionStatusSchema.optional(),
});

export const PatientDniSchema = z.string().trim()
  .regex(/^(?:\d{8})?$/, "El DNI debe contener exactamente 8 dígitos")
  .transform((value) => value || null)
  .nullable()
  .optional();

export const CreatePatientSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  dni: PatientDniSchema,
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const UpdatePatientSchema = z.object({
  dni: PatientDniSchema,
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

export const AvatarSchema = z
  .string()
  .max(AVATAR_MAX_CHARS, "La imagen es demasiado grande")
  .refine(
    (value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https?:\/\//.test(value) || /^\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(value),
    "Formato de imagen no válido"
  );

export const UpdateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, "Nombre requerido").optional(),
    lastName: z.string().trim().min(1, "Apellido requerido").optional(),
    phone: phoneField.or(z.literal("")).nullable().optional(),
    secondaryPhone: phoneField.or(z.literal("")).nullable().optional(),
    address: z.string().trim().max(200).or(z.literal("")).nullable().optional(),
    avatarUrl: AvatarSchema.or(z.literal("")).nullable().optional(),
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

const professionalFields = {
  specialty: z.string().trim().min(1, "Especialidad requerida").max(120).optional(),
  licenseNumber: z.string().trim().max(50).nullable().optional(),
  university: z.string().trim().max(120).nullable().optional(),
};

export const CreateUserSchema = RegisterSchema.extend({
  role: RoleSchema,
  address: z.string().trim().max(200).optional(),
  avatarUrl: AvatarSchema.nullable().optional(),
  ...professionalFields,
});

export const UpdateUserSchema = z.object({
  firstName: z.string().trim().min(1, "Nombre requerido").optional(),
  lastName: z.string().trim().min(1, "Apellido requerido").optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  avatarUrl: AvatarSchema.nullable().optional(),
  role: RoleSchema.optional(),
  isActive: z.boolean().optional(),
  ...professionalFields,
}).refine((data) => Object.keys(data).length > 0, { message: "No hay campos para actualizar" });
