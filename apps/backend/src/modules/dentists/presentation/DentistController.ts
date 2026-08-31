import { Request, Response } from "express";
import { GetDentistsUseCase } from "../application/GetDentistsUseCase";
import { GetAvailabilityUseCase } from "../application/GetAvailabilityUseCase";
import { ConfigureAvailabilityUseCase } from "../application/ConfigureAvailabilityUseCase";
import { AddScheduleExceptionUseCase } from "../application/AddScheduleExceptionUseCase";
import { ConfigureAvailabilitySchema, AddScheduleExceptionSchema } from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class DentistController {
  constructor(
    private getDentistsUseCase: GetDentistsUseCase,
    private getAvailabilityUseCase: GetAvailabilityUseCase,
    private configureAvailabilityUseCase: ConfigureAvailabilityUseCase,
    private addScheduleExceptionUseCase: AddScheduleExceptionUseCase
  ) {}

  getAll = async (_req: Request, res: Response) => {
    const dentists = await this.getDentistsUseCase.execute();
    res.json({ success: true, data: dentists });
  };

  getAvailability = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const date = req.query.date as string | undefined;

    if (!date) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Parametro 'date' requerido (YYYY-MM-DD)" },
      });
      return;
    }

    const slots = await this.getAvailabilityUseCase.execute(id, date);
    res.json({ success: true, data: slots });
  };

  configureAvailability = async (req: Request, res: Response) => {
    const parsed = ConfigureAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const id = req.params.id as string;
    const slot = await this.configureAvailabilityUseCase.execute(id, parsed.data);
    res.json({ success: true, data: slot });
  };

  addScheduleException = async (req: Request, res: Response) => {
    const parsed = AddScheduleExceptionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const id = req.params.id as string;
    const exception = await this.addScheduleExceptionUseCase.execute(id, parsed.data);
    res.json({ success: true, data: exception });
  };
}
