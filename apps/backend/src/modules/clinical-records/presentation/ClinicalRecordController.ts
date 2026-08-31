import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { GetClinicalRecordsUseCase } from "../application/GetClinicalRecordsUseCase";
import { CreateClinicalRecordUseCase } from "../application/CreateClinicalRecordUseCase";
import { CreateClinicalRecordSchema } from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class ClinicalRecordController {
  constructor(
    private getClinicalRecordsUseCase: GetClinicalRecordsUseCase,
    private createClinicalRecordUseCase: CreateClinicalRecordUseCase
  ) {}

  getByPatientId = async (req: AuthRequest, res: Response) => {
    const patientId = req.params.patientId as string;

    const records = await this.getClinicalRecordsUseCase.execute(
      patientId,
      req.user!.id,
      req.user!.role
    );

    res.json({ success: true, data: records });
  };

  create = async (req: AuthRequest, res: Response) => {
    const parsed = CreateClinicalRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const record = await this.createClinicalRecordUseCase.execute(
      req.user!.id,
      parsed.data
    );

    res.status(201).json({ success: true, data: record });
  };
}
