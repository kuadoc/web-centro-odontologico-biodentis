import { Router } from "express";
import { ClinicController } from "./ClinicController";
import { PrismaClinicRepository } from "../infrastructure/PrismaClinicRepository";
import { GetClinicUseCase } from "../application/GetClinicUseCase";
import { UpdateClinicUseCase } from "../application/UpdateClinicUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireRole } from "../../../shared/middlewares/requireRole";
import { Role } from "@biodentis/shared-types";

const clinicRepo = new PrismaClinicRepository();
const getClinicUseCase = new GetClinicUseCase(clinicRepo);
const updateClinicUseCase = new UpdateClinicUseCase(clinicRepo);
const controller = new ClinicController(getClinicUseCase, updateClinicUseCase);

const router = Router();

router.get("/", (req, res, next) => controller.get(req, res).catch(next));
router.patch("/", authenticate, requireRole(Role.ADMIN), (req, res, next) => controller.update(req, res).catch(next));

export { router as clinicRoutes };
