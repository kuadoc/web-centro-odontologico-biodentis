import { AuthRepository } from "../domain/AuthRepository";
import { TokenService } from "../domain/TokenService";
import { AuthenticationError } from "../../../shared/errors/AuthenticationError";

export class RefreshTokenUseCase {
  constructor(
    private authRepo: AuthRepository,
    private tokenService: TokenService
  ) {}

  async execute(refreshToken: string) {
    const stored = await this.authRepo.findRefreshToken(refreshToken);
    if (!stored) {
      throw new AuthenticationError("Refresh token inválido");
    }

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new AuthenticationError("Refresh token expirado");
    }

    await this.authRepo.deleteRefreshToken(refreshToken);

    const newAccessToken = this.tokenService.generateAccessToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });
    const newRefreshToken = this.tokenService.generateRefreshToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });

    await this.authRepo.storeRefreshToken(payload.id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
