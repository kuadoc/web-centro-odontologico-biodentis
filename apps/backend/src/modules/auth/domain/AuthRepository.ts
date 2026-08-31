import { Role } from "@biodentis/shared-types";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  create(data: CreateUserData): Promise<AuthUser>;
  storeRefreshToken(userId: string, token: string): Promise<void>;
  findRefreshToken(token: string): Promise<string | null>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllRefreshTokens(userId: string): Promise<void>;
}
