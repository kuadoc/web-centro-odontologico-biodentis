import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { AuthorizationError } from "../errors/AuthorizationError";
import { Role } from "@biodentis/shared-types";

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthorizationError("Usuario no autenticado");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Rol '${req.user.role}' no tiene permiso para esta acción`
      );
    }

    next();
  };
}
