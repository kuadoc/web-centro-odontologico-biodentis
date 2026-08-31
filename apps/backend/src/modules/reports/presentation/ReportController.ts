import { Request, Response } from "express";
import { GetAppointmentReportUseCase } from "../application/GetAppointmentReportUseCase";
import { DateRangeSchema } from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class ReportController {
  constructor(private getAppointmentReportUseCase: GetAppointmentReportUseCase) {}

  getAppointmentReport = async (req: Request, res: Response) => {
    const parsed = DateRangeSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const report = await this.getAppointmentReportUseCase.execute(
      parsed.data.from,
      parsed.data.to,
      parsed.data.dentistId
    );

    res.json({ success: true, data: report });
  };
}
