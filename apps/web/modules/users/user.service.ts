import { UserRepository } from "./user.repository";
import { NotFoundError, DomainError, ValidationError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";
import bcrypt from "bcrypt";

const userRepository = new UserRepository();

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    return userRepository.update(userId, data);
  }

  async getAll(role?: string) {
    return userRepository.findMany(role ? { role: role as Role } : undefined);
  }

  async getCountByRole() {
    return userRepository.countByRole();
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: Role;
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    });

    if (data.role === "DENTIST") {
      const { prisma } = await import("@/lib/prisma");
      await prisma.dentist.create({
        data: { userId: user.id, specialty: "General" },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(userId: string, data: { firstName?: string; lastName?: string; phone?: string; role?: Role }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    return userRepository.update(userId, data);
  }
}
