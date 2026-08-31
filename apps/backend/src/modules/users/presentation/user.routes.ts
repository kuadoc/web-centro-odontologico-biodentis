import { Router } from "express";
import { UserController } from "./UserController";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";
import { GetProfileUseCase } from "../application/GetProfileUseCase";
import { UpdateProfileUseCase } from "../application/UpdateProfileUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";

const userRepo = new PrismaUserRepository();
const getProfileUseCase = new GetProfileUseCase(userRepo);
const updateProfileUseCase = new UpdateProfileUseCase(userRepo);
const controller = new UserController(getProfileUseCase, updateProfileUseCase);

const router = Router();

router.get("/me", authenticate, (req, res, next) => controller.getMe(req, res).catch(next));
router.patch("/me", authenticate, (req, res, next) => controller.updateMe(req, res).catch(next));

export { router as userRoutes };
