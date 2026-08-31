import { UserRepository } from "../domain/UserRepository";
import { NotFoundError } from "../../../shared/errors/NotFoundError";

export class GetProfileUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("Usuario");
    }
    return user;
  }
}
