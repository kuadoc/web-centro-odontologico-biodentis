import { Router } from "express";
import { ClinicalRecordController } from "./ClinicalRecordController";
import { PrismaClinicalRecordRepository } from "../infrastructure/PrismaClinicalRecordRepository";
import { AccessControlService } from "../domain/AccessControlService";
import { GetClinicalRecordsUseCase } from "../application/GetClinicalRecordsUseCase";
import { CreateClinicalRecordUseCase } from "../application/CreateClinicalRecordUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireRole } from "../../../shared/middlewares/requireRole";
import { Role } from "@biodentis/shared-types";

const clinicalRecordRepo = new PrismaClinicalRecordRepository();
const accessControl = new AccessControlService();

const getClinicalRecordsUseCase = new GetClinicalRecordsUseCase(clinicalRecordRepo, accessControl);
const createClinicalRecordUseCase = new CreateClinicalRecordUseCase(clinicalRecordRepo, accessControl);

const controller = new ClinicalRecordController(
  getClinicalRecordsUseCase,
  createClinicalRecordUseCase
);

const router = Router();

router.get(
  "/:patientId",
  authenticate,
  requireRole(Role.DENTIST, Role.PATIENT),
  (req, res, next) => controller.getByPatientId(req, res).catch(next)
);

router.post(
  "/",
  authenticate,
  requireRole(Role.DENTIST),
  (req, res, next) => controller.create(req, res).catch(next)
);

export { router as clinicalRecordRoutes };
