import { Router } from "express";
import { AuthController } from "./AuthController";
import { PrismaAuthRepository } from "../infrastructure/PrismaAuthRepository";
import { JwtTokenService } from "../infrastructure/JwtTokenService";
import { RegisterUseCase } from "../application/RegisterUseCase";
import { LoginUseCase } from "../application/LoginUseCase";
import { RefreshTokenUseCase } from "../application/RefreshTokenUseCase";
import { LogoutUseCase } from "../application/LogoutUseCase";
import { authenticate } from "../../../shared/middlewares/authenticate";

const authRepo = new PrismaAuthRepository();
const tokenService = new JwtTokenService();

const registerUseCase = new RegisterUseCase(authRepo, tokenService);
const loginUseCase = new LoginUseCase(authRepo, tokenService);
const refreshTokenUseCase = new RefreshTokenUseCase(authRepo, tokenService);
const logoutUseCase = new LogoutUseCase(authRepo);

const controller = new AuthController(
  registerUseCase,
  loginUseCase,
  refreshTokenUseCase,
  logoutUseCase
);

const router = Router();

router.post("/register", (req, res, next) => controller.register(req, res).catch(next));
router.post("/login", (req, res, next) => controller.login(req, res).catch(next));
router.post("/refresh", (req, res, next) => controller.refresh(req, res).catch(next));
router.post("/logout", (req, res, next) => controller.logout(req, res).catch(next));
router.get("/me", authenticate, (req, res, next) => controller.me(req, res).catch(next));

export { router as authRoutes };
