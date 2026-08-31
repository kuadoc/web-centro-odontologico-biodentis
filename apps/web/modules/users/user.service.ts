import { UserRepository } from "./user.repository";
import { NotFoundError } from "@/lib/errors";

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
    return userRepository.findMany(role ? { role: role as import("@workspace/shared-validators").Role } : undefined);
  }
}
