import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/route-access";
import type { z } from "zod";
import type { CompleteAppointmentSchema } from "@biodentis/shared-validators";
import type { Appointment, Dentist, User, DentalUnit, EmailTemplate, SystemSetting, Clinic, MyProfile, SessionInfo, DashboardOverview, DashboardAgenda, AgendaRow, WaitingRoomRow, PatientList, PatientStats, PatientDetail } from "@biodentis/shared-types";

// ─── Query Keys ────────────────────────────────────────────────
export const queryKeys = {
  appointments: ["appointments"] as const,
  appointmentDetail: (id: string) => ["appointments", id] as const,
  dentists: ["dentists"] as const,
  dentistMe: ["dentist", "me"] as const,
  users: ["users"] as const,
  usersByRole: (role: string) => ["users", role] as const,
  patients: ["patients"] as const,
  patientDetail: (id: string) => ["patients", "detail", id] as const,
  patientStats: ["patients", "stats"] as const,
  clinic: ["clinic"] as const,
  clinicalRecords: (patientId: string) =>
    ["clinical-records", patientId] as const,
  profile: ["profile"] as const,
  myProfile: ["profile", "full"] as const,
  sessions: ["profile", "sessions"] as const,
} as const;

// ─── Dashboard ─────────────────────────────────────────────────
export const dashboardKeys = {
  overview: (date?: string) => ["dashboard", "overview", date ?? "today"] as const,
  agenda: (filters: Record<string, string | number | undefined>) =>
    ["dashboard", "agenda", filters] as const,
  waitingRoom: (date?: string) => ["dashboard", "waiting-room", date ?? "today"] as const,
} as const;

/** Serializa filtros a query string, omitiendo los vacíos. */
function toQuery(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
}

export function useDashboardOverview(date?: string) {
  return useQuery({
    queryKey: dashboardKeys.overview(date),
    queryFn: () => api.get<DashboardOverview>(`/api/dashboard${toQuery({ date })}`),
    // El panel del dia cambia solo: refresco cada minuto.
    refetchInterval: 60_000,
  });
}

export function useDashboardAgenda(filters: { date?: string; status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: dashboardKeys.agenda(filters),
    queryFn: () => api.get<DashboardAgenda>(`/api/dashboard/agenda${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useWaitingRoom(date?: string) {
  return useQuery({
    queryKey: dashboardKeys.waitingRoom(date),
    queryFn: () => api.get<WaitingRoomRow[]>(`/api/dashboard/waiting-room${toQuery({ date })}`),
    refetchInterval: 30_000,
  });
}

export function useCallNextPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ called: AgendaRow | null; message?: string }>("/api/dashboard/waiting-room/call-next", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCheckInPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority?: string }) =>
      api.patch(`/api/appointments/${id}/check-in`, { priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Appointments ──────────────────────────────────────────────
export function useAppointments(filters?: Record<string, string>) {
  const params = filters
    ? "?" + new URLSearchParams(filters).toString()
    : "";
  return useQuery({
    queryKey: [...queryKeys.appointments, filters],
    queryFn: () => api.get<Appointment[]>(`/api/appointments${params}`),
  });
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

/** Bloques libres de un odontologo en una fecha (YYYY-MM-DD). */
export function useAvailableSlots(dentistId: string, date: string, treatmentId?: string) {
  return useQuery({
    queryKey: ["dentists", dentistId, "slots", date, treatmentId] as const,
    queryFn: () => api.get<AvailableSlot[]>(`/api/dentists/${dentistId}/availability?date=${date}${treatmentId ? `&treatmentId=${treatmentId}` : ""}`),
    enabled: !!dentistId && !!date,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/appointments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
      qc.invalidateQueries({ queryKey: queryKeys.patients });
      qc.invalidateQueries({ queryKey: queryKeys.patientStats });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: queryKeys.dentists });
    },
  });
}

export function useConfirmAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/appointments/${id}/confirm`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/api/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

export function useCompleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/appointments/${id}/status`, { status: "COMPLETED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

export function useCompleteWithNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: z.infer<typeof CompleteAppointmentSchema> & { id: string }) =>
      api.patch(`/api/appointments/${id}/complete`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
      qc.invalidateQueries({ queryKey: ["clinical-records"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Dentists ──────────────────────────────────────────────────
export function useDentists() {
  return useQuery({
    queryKey: queryKeys.dentists,
    queryFn: () => api.get<Dentist[]>("/api/dentists"),
  });
}

export interface WeeklyAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function useDentistAvailability(dentistId: string) {
  return useQuery({
    queryKey: ["dentists", dentistId, "availability"] as const,
    queryFn: () => api.get<WeeklyAvailability[]>(`/api/dentists/${dentistId}/availability`),
    enabled: !!dentistId,
  });
}

export function useReplaceDentistAvailability(dentistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: WeeklyAvailability[]) =>
      api.put<WeeklyAvailability[]>(`/api/dentists/${dentistId}/availability`, { days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dentists", dentistId, "availability"] }),
  });
}

export function useDentistMe() {
  return useQuery({
    queryKey: queryKeys.dentistMe,
    queryFn: () => api.get<Dentist & { user: User }>("/api/dentists/me"),
  });
}

// ─── Profile (Mi Perfil) ───────────────────────────────────────
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.get<User>("/api/users/me"),
  });
}

/** Perfil completo: usuario + ficha profesional + horario semanal real. */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: () => api.get<MyProfile>("/api/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      phone?: string | null;
      secondaryPhone?: string | null;
      firstName?: string;
      lastName?: string;
      address?: string | null;
      avatarUrl?: string | null;
    }) => api.patch("/api/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
      qc.invalidateQueries({ queryKey: queryKeys.myProfile });
      qc.invalidateQueries({ queryKey: ["public-dentists"] });
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdatePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword?: string }) =>
      api.patch("/api/profile/password", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

// ─── Sesiones activas ──────────────────────────────────────────
export function useMySessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => api.get<SessionInfo[]>("/api/profile/sessions"),
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del("/api/profile/sessions"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

/** Datos profesionales del odontologo (solo ADMIN). `userId` es el User.id. */
export function useUpdateDentistProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: unknown }) =>
      api.patch(`/api/dentists/${userId}/profile`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dentists });
      qc.invalidateQueries({ queryKey: queryKeys.myProfile });
      qc.invalidateQueries({ queryKey: ["public-dentists"] });
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// ─── Users ─────────────────────────────────────────────────────
export function useUsers(role?: string) {
  const { user } = useAuth();
  const params = role ? `?role=${role}` : "";
  return useQuery({
    queryKey: role ? queryKeys.usersByRole(role) : queryKeys.users,
    queryFn: () => api.get<User[]>(`/api/users${params}`),
    enabled: canAccessRoute(user?.role, "/users"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: ["public-dentists"] });
      qc.invalidateQueries({ queryKey: queryKeys.dentists });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`/api/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: ["public-dentists"] });
      qc.invalidateQueries({ queryKey: queryKeys.dentists });
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: ["public-dentists"] });
      qc.invalidateQueries({ queryKey: queryKeys.dentists });
    },
  });
}

// ─── Patients (directorio administrativo) ──────────────────────
export interface PatientFilters {
  search?: string;
  /** "active" | "inactive" */
  status?: string;
  /** "with" | "without" */
  appointments?: string;
  page?: number;
  pageSize?: number;
}

/** Listado paginado: el filtrado y la paginación ocurren en el servidor. */
export function usePatients(filters: PatientFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.patients, filters],
    queryFn: () => api.get<PatientList>(`/api/patients${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  });
}

/** KPIs del encabezado. Se calculan sobre toda la base, no sobre la página visible. */
export function usePatientStats() {
  return useQuery({
    queryKey: queryKeys.patientStats,
    queryFn: () => api.get<PatientStats>("/api/patients/stats"),
  });
}

export function usePatientDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.patientDetail(id ?? ""),
    queryFn: () => api.get<PatientDetail>(`/api/patients/${id}`),
    enabled: !!id,
  });
}

/** Invalida listado, KPIs y detalle tras cualquier escritura. */
function invalidatePatients(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.patients });
  qc.invalidateQueries({ queryKey: queryKeys.patientStats });
  if (id) qc.invalidateQueries({ queryKey: queryKeys.patientDetail(id) });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/patients", data),
    onSuccess: () => invalidatePatients(qc),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`/api/patients/${id}`, data),
    onSuccess: (_, { id }) => {
      invalidatePatients(qc, id);
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

/** Activa o desactiva la cuenta; el motivo queda en el registro de auditoría. */
export function useSetPatientActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) =>
      api.patch(`/api/patients/${id}/status`, { isActive, reason }),
    onSuccess: (_, { id }) => invalidatePatients(qc, id),
  });
}

/** Descarga el CSV del listado filtrado completo (no solo la página visible). */
export function useExportPatients() {
  return useMutation({
    mutationFn: (filters: PatientFilters) =>
      api.download(`/api/patients/export${toQuery(filters)}`, "pacientes.csv"),
  });
}

// ─── Clinical Records ──────────────────────────────────────────
export function useClinicalRecords(patientId: string) {
  return useQuery({
    queryKey: queryKeys.clinicalRecords(patientId),
    queryFn: () =>
      api.get(`/api/clinical-records/${patientId}`),
    enabled: !!patientId,
  });
}

// ─── Clinic ────────────────────────────────────────────────────
export function useClinic() {
  return useQuery({
    queryKey: queryKeys.clinic,
    queryFn: () => api.get("/api/clinic"),
  });
}

// ─── Config ────────────────────────────────────────────────────
export const configKeys = {
  full: ["config"] as const,
  general: ["config", "general"] as const,
  dentalUnits: ["config", "dental-units"] as const,
  exceptions: ["config", "exceptions"] as const,
  emailTemplates: ["config", "email-templates"] as const,
  security: ["config", "security"] as const,
  jwt: ["config", "jwt"] as const,
  notifications: ["config", "notifications"] as const,
} as const;

export function useFullConfig() {
  return useQuery({
    queryKey: configKeys.full,
    queryFn: () => api.get("/api/config"),
  });
}

export function useGeneralConfig() {
  return useQuery({
    queryKey: configKeys.general,
    queryFn: () => api.get("/api/config?section=general"),
  });
}

export function useUpdateClinic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.patch("/api/config", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.full });
      qc.invalidateQueries({ queryKey: queryKeys.clinic });
    },
  });
}

// ─── Dental Units ──────────────────────────────────────────────
export function useDentalUnits() {
  return useQuery({
    queryKey: configKeys.dentalUnits,
    queryFn: () => api.get<DentalUnit[]>("/api/config/dental-units"),
  });
}

export function useCreateDentalUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/config/dental-units", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.dentalUnits });
    },
  });
}

export function useUpdateDentalUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`/api/config/dental-units/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.dentalUnits });
    },
  });
}

export function useDeleteDentalUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/config/dental-units/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.dentalUnits });
    },
  });
}

// ─── Email Templates ───────────────────────────────────────────
export function useEmailTemplates() {
  return useQuery({
    queryKey: configKeys.emailTemplates,
    queryFn: () => api.get<EmailTemplate[]>("/api/config/email-templates"),
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/config/email-templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.emailTemplates });
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`/api/config/email-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.emailTemplates });
    },
  });
}

export function useToggleEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/config/email-templates/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.emailTemplates });
    },
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/config/email-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.emailTemplates });
    },
  });
}

// ─── Security Settings ─────────────────────────────────────────
export function useSecuritySettings() {
  return useQuery({
    queryKey: configKeys.security,
    queryFn: () => api.get<SystemSetting[]>("/api/config/security"),
  });
}

export function useUpdateSecuritySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.put("/api/config/security", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.security });
    },
  });
}

// ─── JWT Settings ──────────────────────────────────────────────
export function useJwtSettings() {
  return useQuery({
    queryKey: configKeys.jwt,
    queryFn: () => api.get<SystemSetting[]>("/api/config/jwt"),
  });
}

export function useUpdateJwtSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.put("/api/config/jwt", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.jwt });
    },
  });
}

// ─── Notification Settings ─────────────────────────────────────
export function useNotificationSettings() {
  return useQuery({
    queryKey: configKeys.notifications,
    queryFn: () => api.get<SystemSetting[]>("/api/config/notifications"),
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.put("/api/config/notifications", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.notifications });
    },
  });
}

// ---- Excepciones clínicas (feriados, recesos, mantenimiento) ----

export interface ClinicException {
  id: string;
  scope: "DENTIST" | "CLINIC" | "UNIT";
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  dentistId: string | null;
  dentalUnitId: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export function useClinicExceptions() {
  return useQuery({
    queryKey: configKeys.exceptions,
    queryFn: () => api.get<ClinicException[]>("/api/config/exceptions"),
  });
}

export function useCreateClinicException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post<ClinicException>("/api/config/exceptions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.exceptions });
      qc.invalidateQueries({ queryKey: queryKeys.dentists });
    },
  });
}
