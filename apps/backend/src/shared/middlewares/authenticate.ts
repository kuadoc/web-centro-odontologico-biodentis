import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../types";
import { AuthenticationError } from "../errors/AuthenticationError";
import { UserPayload } from "@biodentis/shared-types";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-secret";

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Token de acceso requerido");
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as UserPayload;
    req.user = payload;
    next();
  } catch {
    throw new AuthenticationError("Token de acceso inválido o expirado");
  }
}
