import { Router } from "express";
import { ReportController } from "./ReportController";
import { PrismaReportRepository } from "../infrastructure/PrismaReportRepository";
import { GetAppointmentReportUseCase } from "../application/GetAppointmentReportUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireRole } from "../../../shared/middlewares/requireRole";
import { Role } from "@biodentis/shared-types";

const reportRepo = new PrismaReportRepository();
const getAppointmentReportUseCase = new GetAppointmentReportUseCase(reportRepo);
const controller = new ReportController(getAppointmentReportUseCase);

const router = Router();

router.get(
  "/appointments",
  authenticate,
  requireRole(Role.ADMIN),
  (req, res, next) => controller.getAppointmentReport(req, res).catch(next)
);

export { router as reportRoutes };
