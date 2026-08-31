import { UserRepository } from "../domain/UserRepository";
import { UpdateProfileInput } from "@biodentis/shared-validators";
import { NotFoundError } from "../../../shared/errors/NotFoundError";

export class UpdateProfileUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, input: UpdateProfileInput) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("Usuario");
    }

    return this.userRepo.update(userId, input);
  }
}
