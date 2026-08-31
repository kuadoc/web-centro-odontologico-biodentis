import bcrypt from "bcrypt";
import { AuthRepository } from "../domain/AuthRepository";
import { TokenService } from "../domain/TokenService";
import { LoginInput } from "@biodentis/shared-validators";
import { AuthenticationError } from "../../../shared/errors/AuthenticationError";

export class LoginUseCase {
  constructor(
    private authRepo: AuthRepository,
    private tokenService: TokenService
  ) {}

  async execute(input: LoginInput) {
    const user = await this.authRepo.findByEmail(input.email);
    if (!user) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new AuthenticationError("Credenciales inválidas");
    }

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
