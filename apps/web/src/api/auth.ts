import { api } from "./client";
import { RegisterInput, LoginInput } from "@biodentis/shared-validators";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
  accessToken: string;
}

export const authApi = {
  register: async (data: RegisterInput) => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/auth/register", data);
    return response.data.data;
  },

  login: async (data: LoginInput) => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/auth/login", data);
    return response.data.data;
  },

  logout: async () => {
    await api.post("/auth/logout");
  },

  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data.data;
  },
};
