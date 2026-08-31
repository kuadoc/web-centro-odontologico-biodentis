import { Router } from "express";
import { AppointmentController } from "./AppointmentController";
import { PrismaAppointmentRepository } from "../infrastructure/PrismaAppointmentRepository";
import { PrismaDentistRepository } from "../../dentists/infrastructure/PrismaDentistRepository";
import { AvailabilityService } from "../../dentists/domain/AvailabilityService";
import { RequestAppointmentUseCase } from "../application/RequestAppointmentUseCase";
import { ConfirmAppointmentUseCase } from "../application/ConfirmAppointmentUseCase";
import { RejectAppointmentUseCase } from "../application/RejectAppointmentUseCase";
import { RescheduleAppointmentUseCase } from "../application/RescheduleAppointmentUseCase";
import { CancelAppointmentUseCase } from "../application/CancelAppointmentUseCase";
import { MarkAppointmentStatusUseCase } from "../application/MarkAppointmentStatusUseCase";
import { GetAppointmentsUseCase } from "../application/GetAppointmentsUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireRole } from "../../../shared/middlewares/requireRole";
import { Role } from "@biodentis/shared-types";

const appointmentRepo = new PrismaAppointmentRepository();
const dentistRepo = new PrismaDentistRepository();
const availabilityService = new AvailabilityService(dentistRepo);

const requestAppointmentUseCase = new RequestAppointmentUseCase(appointmentRepo, availabilityService);
const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(appointmentRepo);
const rejectAppointmentUseCase = new RejectAppointmentUseCase(appointmentRepo);
const rescheduleAppointmentUseCase = new RescheduleAppointmentUseCase(appointmentRepo, availabilityService);
const cancelAppointmentUseCase = new CancelAppointmentUseCase(appointmentRepo);
const markAppointmentStatusUseCase = new MarkAppointmentStatusUseCase(appointmentRepo);
const getAppointmentsUseCase = new GetAppointmentsUseCase(appointmentRepo);

const controller = new AppointmentController(
  requestAppointmentUseCase,
  confirmAppointmentUseCase,
  rejectAppointmentUseCase,
  rescheduleAppointmentUseCase,
  cancelAppointmentUseCase,
  markAppointmentStatusUseCase,
  getAppointmentsUseCase
);

const router = Router();

router.get("/", authenticate, (req, res, next) => controller.getAll(req, res).catch(next));

router.post(
  "/",
  authenticate,
  requireRole(Role.PATIENT),
  (req, res, next) => controller.request(req, res).catch(next)
);

router.patch(
  "/:id/confirm",
  authenticate,
  requireRole(Role.RECEPTIONIST),
  (req, res, next) => controller.confirm(req, res).catch(next)
);

router.patch(
  "/:id/reject",
  authenticate,
  requireRole(Role.RECEPTIONIST),
  (req, res, next) => controller.reject(req, res).catch(next)
);

router.patch(
  "/:id/reschedule",
  authenticate,
  requireRole(Role.PATIENT, Role.RECEPTIONIST),
  (req, res, next) => controller.reschedule(req, res).catch(next)
);

router.patch(
  "/:id/cancel",
  authenticate,
  requireRole(Role.PATIENT, Role.RECEPTIONIST),
  (req, res, next) => controller.cancel(req, res).catch(next)
);

router.patch(
  "/:id/status",
  authenticate,
  requireRole(Role.DENTIST),
  (req, res, next) => controller.updateStatus(req, res).catch(next)
);

export { router as appointmentRoutes };
