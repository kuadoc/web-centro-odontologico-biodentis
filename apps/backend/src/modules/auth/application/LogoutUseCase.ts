import { AuthRepository } from "../domain/AuthRepository";

export class LogoutUseCase {
  constructor(private authRepo: AuthRepository) {}

  async execute(refreshToken: string): Promise<void> {
    await this.authRepo.deleteRefreshToken(refreshToken);
  }
}
