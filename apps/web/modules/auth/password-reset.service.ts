import bcrypt from "bcrypt";
import { ResetPasswordSchema } from "@biodentis/shared-validators";
import { hashToken } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { PasswordResetRepository } from "./password-reset.repository";

export class PasswordResetService {
  constructor(private readonly repository = new PasswordResetRepository()) {}
  async reset(input: unknown) {
    const parsed = ResetPasswordSchema.parse(input);
    const token = await this.repository.find(hashToken(parsed.token));
    if (!token) throw new DomainError("Token inválido o expirado", 400);
    if (token.usedAt) throw new DomainError("Token ya utilizado", 400);
    if (new Date() > token.expiresAt) throw new DomainError("Token expirado", 400);
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    await this.repository.reset(token.id, token.userId, passwordHash);
    return { message: "Contraseña actualizada correctamente" };
  }
}
