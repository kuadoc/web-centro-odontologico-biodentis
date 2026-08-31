import { api } from "./client";

export interface ClinicalRecord {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string };
  dentist: { id: string; specialty: string; user: { firstName: string; lastName: string } };
}

export const clinicalRecordsApi = {
  getByPatientId: async (patientId: string) => {
    const response = await api.get<{ success: boolean; data: ClinicalRecord[] }>(
      `/clinical-records/${patientId}`
    );
    return response.data.data;
  },

  create: async (data: { patientId: string; appointmentId: string; notes: string }) => {
    const response = await api.post<{ success: boolean; data: ClinicalRecord }>("/clinical-records", data);
    return response.data.data;
  },
};
