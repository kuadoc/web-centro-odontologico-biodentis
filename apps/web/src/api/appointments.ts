import { api } from "./client";
import { AppointmentStatus } from "@biodentis/shared-types";

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
  patient: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  dentist: { id: string; specialty: string; user: { firstName: string; lastName: string } };
}

export interface RequestAppointmentData {
  dentistId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export const appointmentsApi = {
  getAll: async (params?: { from?: string; to?: string; dentistId?: string }) => {
    const response = await api.get<{ success: boolean; data: Appointment[] }>("/appointments", { params });
    return response.data.data;
  },

  request: async (data: RequestAppointmentData) => {
    const response = await api.post<{ success: boolean; data: Appointment }>("/appointments", data);
    return response.data.data;
  },

  confirm: async (id: string) => {
    const response = await api.patch<{ success: boolean; data: Appointment }>(`/appointments/${id}/confirm`);
    return response.data.data;
  },

  reject: async (id: string) => {
    const response = await api.patch<{ success: boolean; data: Appointment }>(`/appointments/${id}/reject`);
    return response.data.data;
  },

  reschedule: async (id: string, data: { date: string; startTime: string; endTime: string }) => {
    const response = await api.patch<{ success: boolean; data: Appointment }>(`/appointments/${id}/reschedule`, data);
    return response.data.data;
  },

  cancel: async (id: string) => {
    const response = await api.patch<{ success: boolean; data: Appointment }>(`/appointments/${id}/cancel`);
    return response.data.data;
  },

  updateStatus: async (id: string, status: "COMPLETED" | "NO_SHOW") => {
    const response = await api.patch<{ success: boolean; data: Appointment }>(`/appointments/${id}/status`, { status });
    return response.data.data;
  },
};
