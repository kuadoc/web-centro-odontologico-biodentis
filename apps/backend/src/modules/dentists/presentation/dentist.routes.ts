import { Router } from "express";
import { DentistController } from "./DentistController";
import { PrismaDentistRepository } from "../infrastructure/PrismaDentistRepository";
import { AvailabilityService } from "../domain/AvailabilityService";
import { GetDentistsUseCase } from "../application/GetDentistsUseCase";
import { GetAvailabilityUseCase } from "../application/GetAvailabilityUseCase";
import { ConfigureAvailabilityUseCase } from "../application/ConfigureAvailabilityUseCase";
import { AddScheduleExceptionUseCase } from "../application/AddScheduleExceptionUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireRole } from "../../../shared/middlewares/requireRole";
import { Role } from "@biodentis/shared-types";

const dentistRepo = new PrismaDentistRepository();
const availabilityService = new AvailabilityService(dentistRepo);

const getDentistsUseCase = new GetDentistsUseCase(dentistRepo);
const getAvailabilityUseCase = new GetAvailabilityUseCase(availabilityService);
const configureAvailabilityUseCase = new ConfigureAvailabilityUseCase(dentistRepo);
const addScheduleExceptionUseCase = new AddScheduleExceptionUseCase(dentistRepo);

const controller = new DentistController(
  getDentistsUseCase,
  getAvailabilityUseCase,
  configureAvailabilityUseCase,
  addScheduleExceptionUseCase
);

const router = Router();

router.get("/", authenticate, (req, res, next) => controller.getAll(req, res).catch(next));
router.get("/:id/availability", authenticate, (req, res, next) => controller.getAvailability(req, res).catch(next));

router.post(
  "/:id/availability",
  authenticate,
  requireRole(Role.ADMIN),
  (req, res, next) => controller.configureAvailability(req, res).catch(next)
);

router.post(
  "/:id/schedule-exceptions",
  authenticate,
  requireRole(Role.ADMIN),
  (req, res, next) => controller.addScheduleException(req, res).catch(next)
);

export { router as dentistRoutes };
