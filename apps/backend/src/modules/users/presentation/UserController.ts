import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { GetProfileUseCase } from "../application/GetProfileUseCase";
import { UpdateProfileUseCase } from "../application/UpdateProfileUseCase";
import { UpdateProfileSchema } from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class UserController {
  constructor(
    private getProfileUseCase: GetProfileUseCase,
    private updateProfileUseCase: UpdateProfileUseCase
  ) {}

  getMe = async (req: AuthRequest, res: Response) => {
    const user = await this.getProfileUseCase.execute(req.user!.id);
    res.json({ success: true, data: user });
  };

  updateMe = async (req: AuthRequest, res: Response) => {
    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const user = await this.updateProfileUseCase.execute(req.user!.id, parsed.data);
    res.json({ success: true, data: user });
  };
}
