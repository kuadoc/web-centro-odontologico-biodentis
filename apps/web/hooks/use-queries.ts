import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Appointment, Dentist, User, DentalUnit, EmailTemplate, SystemSetting, Clinic } from "@biodentis/shared-types";

// ─── Query Keys ────────────────────────────────────────────────
export const queryKeys = {
  appointments: ["appointments"] as const,
  appointmentDetail: (id: string) => ["appointments", id] as const,
  dentists: ["dentists"] as const,
  users: ["users"] as const,
  usersByRole: (role: string) => ["users", role] as const,
  clinic: ["clinic"] as const,
  clinicalRecords: (patientId: string) =>
    ["clinical-records", patientId] as const,
} as const;

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

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/appointments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
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
    mutationFn: (id: string) =>
      api.patch(`/api/appointments/${id}/cancel`, {}),
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

// ─── Dentists ──────────────────────────────────────────────────
export function useDentists() {
  return useQuery({
    queryKey: queryKeys.dentists,
    queryFn: () => api.get<Dentist[]>("/api/dentists"),
  });
}

// ─── Users ─────────────────────────────────────────────────────
export function useUsers(role?: string) {
  const params = role ? `?role=${role}` : "";
  return useQuery({
    queryKey: role ? queryKeys.usersByRole(role) : queryKeys.users,
    queryFn: () => api.get<User[]>(`/api/users${params}`),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/api/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
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
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
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
