import { Request, Response } from "express";
import { RegisterUseCase } from "../application/RegisterUseCase";
import { LoginUseCase } from "../application/LoginUseCase";
import { RefreshTokenUseCase } from "../application/RefreshTokenUseCase";
import { LogoutUseCase } from "../application/LogoutUseCase";
import { AuthRequest } from "../../../shared/types";
import {
  RegisterSchema,
  LoginSchema,
} from "@biodentis/shared-validators";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private logoutUseCase: LogoutUseCase
  ) {}

  register = async (req: Request, res: Response) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const result = await this.registerUseCase.execute(parsed.data);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  };

  login = async (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error);
    }

    const result = await this.loginUseCase.execute(parsed.data);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  };

  refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: "AUTHENTICATION_ERROR", message: "Refresh token requerido" },
      });
      return;
    }

    const result = await this.refreshTokenUseCase.execute(refreshToken);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.logoutUseCase.execute(refreshToken);
    }

    res.clearCookie("refreshToken");
    res.json({ success: true, data: { message: "Sesión cerrada" } });
  };

  me = async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  };
}
