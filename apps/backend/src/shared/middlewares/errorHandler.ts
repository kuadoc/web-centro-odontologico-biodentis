import { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "../errors/AuthenticationError";
import { AuthorizationError } from "../errors/AuthorizationError";
import { NotFoundError } from "../errors/NotFoundError";
import { ValidationError } from "../errors/ValidationError";
import { DomainError } from "../errors/DomainError";
import { ScheduleConflictError } from "../errors/ScheduleConflictError";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: err.message, errors: err.errors },
    });
    return;
  }

  if (err instanceof AuthenticationError) {
    res.status(401).json({
      success: false,
      error: { code: "AUTHENTICATION_ERROR", message: err.message },
    });
    return;
  }

  if (err instanceof AuthorizationError) {
    res.status(403).json({
      success: false,
      error: { code: "AUTHORIZATION_ERROR", message: err.message },
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: err.message },
    });
    return;
  }

  if (err instanceof ScheduleConflictError) {
    res.status(409).json({
      success: false,
      error: { code: "SCHEDULE_CONFLICT", message: err.message },
    });
    return;
  }

  if (err instanceof DomainError) {
    res.status(400).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}
