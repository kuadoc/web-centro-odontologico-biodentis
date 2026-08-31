import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { RequestAppointmentUseCase } from "../application/RequestAppointmentUseCase";
import { ConfirmAppointmentUseCase } from "../application/ConfirmAppointmentUseCase";
import { RejectAppointmentUseCase } from "../application/RejectAppointmentUseCase";
import { RescheduleAppointmentUseCase } from "../application/RescheduleAppointmentUseCase";
import { CancelAppointmentUseCase } from "../application/CancelAppointmentUseCase";
import { MarkAppointmentStatusUseCase } from "../application/MarkAppointmentStatusUseCase";
import { GetAppointmentsUseCase } from "../application/GetAppointmentsUseCase";
import {
  RequestAppointmentSchema,
  RescheduleAppointmentSchema,
  AppointmentStatusUpdateSchema,
} from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";
import { AppointmentStatus } from "@biodentis/shared-types";

export class AppointmentController {
  constructor(
    private requestAppointmentUseCase: RequestAppointmentUseCase,
    private confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private rejectAppointmentUseCase: RejectAppointmentUseCase,
    private rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
    private cancelAppointmentUseCase: CancelAppointmentUseCase,
    private markAppointmentStatusUseCase: MarkAppointmentStatusUseCase,
    private getAppointmentsUseCase: GetAppointmentsUseCase
  ) {}

  getAll = async (req: AuthRequest, res: Response) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const dentistId = req.query.dentistId as string | undefined;

    const appointments = await this.getAppointmentsUseCase.execute(
      req.user!.id,
      req.user!.role,
      { from, to, dentistId }
    );
    res.json({ success: true, data: appointments });
  };

  request = async (req: AuthRequest, res: Response) => {
    const parsed = RequestAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const appointment = await this.requestAppointmentUseCase.execute(
      req.user!.id,
      parsed.data
    );
    res.status(201).json({ success: true, data: appointment });
  };

  confirm = async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const appointment = await this.confirmAppointmentUseCase.execute(id);
    res.json({ success: true, data: appointment });
  };

  reject = async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const appointment = await this.rejectAppointmentUseCase.execute(id);
    res.json({ success: true, data: appointment });
  };

  reschedule = async (req: AuthRequest, res: Response) => {
    const parsed = RescheduleAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const id = req.params.id as string;
    const appointment = await this.rescheduleAppointmentUseCase.execute(
      id,
      parsed.data,
      req.user!.role
    );
    res.json({ success: true, data: appointment });
  };

  cancel = async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const appointment = await this.cancelAppointmentUseCase.execute(id, req.user!.id);
    res.json({ success: true, data: appointment });
  };

  updateStatus = async (req: AuthRequest, res: Response) => {
    const parsed = AppointmentStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const id = req.params.id as string;
    const status = parsed.data.status as AppointmentStatus;
    const appointment = await this.markAppointmentStatusUseCase.execute(
      id,
      status,
      req.user!.id
    );
    res.json({ success: true, data: appointment });
  };
}
