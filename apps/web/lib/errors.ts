export class AuthenticationError extends Error {
  statusCode = 401;
  constructor(message = "No autenticado") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  constructor(message = "Sin permisos") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = "Recurso no encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message = "Input inválido") {
    super(message);
    this.name = "ValidationError";
  }
}

export class DomainError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
  }
}

export class ScheduleConflictError extends Error {
  statusCode = 409;
  constructor(message = "Choque de horario") {
    super(message);
    this.name = "ScheduleConflictError";
  }
}

export class InfrastructureError extends Error {
  statusCode = 500;
  constructor(message = "Error interno del servidor") {
    super(message);
    this.name = "InfrastructureError";
  }
}

export function handleApiError(error: unknown): Response {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError ||
    error instanceof ValidationError ||
    error instanceof DomainError ||
    error instanceof ScheduleConflictError ||
    error instanceof InfrastructureError
  ) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }

  // JWT errors from jsonwebtoken library
  if (error instanceof Error && (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError" || error.name === "NotBeforeError")) {
    return Response.json({ error: "Sesión expirada" }, { status: 401 });
  }

  console.error("Unhandled error:", error);
  return Response.json({ error: "Error interno del servidor" }, { status: 500 });
}
