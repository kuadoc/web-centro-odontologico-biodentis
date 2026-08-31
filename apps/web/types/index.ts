import { Role } from "@workspace/shared-validators";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
