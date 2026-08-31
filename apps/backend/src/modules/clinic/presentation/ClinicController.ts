import { Request, Response } from "express";
import { GetClinicUseCase } from "../application/GetClinicUseCase";
import { UpdateClinicUseCase } from "../application/UpdateClinicUseCase";
import { UpdateClinicSchema } from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class ClinicController {
  constructor(
    private getClinicUseCase: GetClinicUseCase,
    private updateClinicUseCase: UpdateClinicUseCase
  ) {}

  get = async (_req: Request, res: Response) => {
    const clinic = await this.getClinicUseCase.execute();
    res.json({ success: true, data: clinic });
  };

  update = async (req: Request, res: Response) => {
    const parsed = UpdateClinicSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const clinic = await this.updateClinicUseCase.execute(parsed.data);
    res.json({ success: true, data: clinic });
  };
}
