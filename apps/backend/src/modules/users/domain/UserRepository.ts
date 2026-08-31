import { Role } from "@biodentis/shared-types";

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<UserProfile | null>;
  update(id: string, data: { firstName?: string; lastName?: string; phone?: string }): Promise<UserProfile>;
  findAll(): Promise<UserProfile[]>;
  findByRole(role: Role): Promise<UserProfile[]>;
}
