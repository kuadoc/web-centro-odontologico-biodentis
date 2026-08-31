import { api } from "./client";

export interface Dentist {
  id: string;
  userId: string;
  specialty: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

export const dentistsApi = {
  getAll: async () => {
    const response = await api.get<{ success: boolean; data: Dentist[] }>("/dentists");
    return response.data.data;
  },

  getAvailability: async (dentistId: string, date: string) => {
    const response = await api.get<{ success: boolean; data: AvailableSlot[] }>(
      `/dentists/${dentistId}/availability`,
      { params: { date } }
    );
    return response.data.data;
  },
};
