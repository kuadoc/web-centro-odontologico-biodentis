import { UserRepository } from "./user.repository";
import { NotFoundError, DomainError, ValidationError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";
import bcrypt from "bcrypt";
import { CreateUserSchema, UpdateUserSchema } from "@biodentis/shared-validators";

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    return this.userRepository.update(userId, data);
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError("Contraseña actual incorrecta");
    if (newPassword.length < 8) throw new ValidationError("La nueva contraseña debe tener al menos 8 caracteres");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, passwordHash);
    return { success: true };
  }

  async getAll(role?: string) {
    return this.userRepository.findMany(role ? { role: role as Role } : undefined);
  }

  async getCountByRole() {
    return this.userRepository.countByRole();
  }

  async create(input: unknown) {
    const data = CreateUserSchema.parse(input);
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      role: data.role as Role,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      avatarUrl: data.avatarUrl,
      ...(data.role === "DENTIST" ? { dentistProfile: {
        specialty: data.specialty ?? "General",
        licenseNumber: data.licenseNumber,
        university: data.university,
      } } : {}),
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(userId: string, input: unknown, actorId?: string) {
    const { specialty, licenseNumber, university, ...data } = UpdateUserSchema.parse(input);
    const apply = async (repository: UserRepository) => {
      const user = await repository.findById(userId);
      if (!user) throw new NotFoundError("Usuario no encontrado");
      if (data.isActive === false) {
        const { pending, confirmed } = await repository.countBlockingAppointments(userId);
        if (pending || confirmed) {
          throw new DomainError(
            `No se puede desactivar al odontólogo: tiene ${pending} citas pendientes y ${confirmed} confirmadas. Coordina con Recepción la reasignación de las pendientes y con Administración las citas confirmadas.`, 409,
          );
        }
      }
      const result = await repository.update(userId, {
        ...data,
        ...((data.role ?? user.role) === "DENTIST" ? { dentistProfile: { upsert: {
          create: { specialty: specialty ?? "General", licenseNumber, university },
          update: { specialty, licenseNumber, university },
        } } } : {}),
      });
      if (actorId && data.isActive !== undefined && user.isActive !== data.isActive) {
        await repository.logStateChange(actorId, userId, data.isActive);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safeUser } = result;
      return safeUser;
    };
    return data.isActive === undefined ? apply(this.userRepository) : this.userRepository.withTransaction(apply);
  }
}
