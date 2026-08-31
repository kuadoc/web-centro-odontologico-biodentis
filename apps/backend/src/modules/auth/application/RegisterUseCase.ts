import bcrypt from "bcrypt";
import { AuthRepository } from "../domain/AuthRepository";
import { TokenService } from "../domain/TokenService";
import { RegisterInput } from "@biodentis/shared-validators";
import { DomainError } from "../../../shared/errors/DomainError";
import { Role } from "@biodentis/shared-types";

export class RegisterUseCase {
  constructor(
    private authRepo: AuthRepository,
    private tokenService: TokenService
  ) {}

  async execute(input: RegisterInput) {
    const existing = await this.authRepo.findByEmail(input.email);
    if (existing) {
      throw new DomainError("El email ya está registrado", "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.authRepo.create({
      email: input.email,
      passwordHash,
      role: input.role as Role,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    });

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    await this.authRepo.storeRefreshToken(user.id, refreshToken);

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }
}
