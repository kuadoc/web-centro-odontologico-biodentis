import { NextRequest } from "next/server";
import { verifyAccessToken, TokenPayload } from "./auth";
import { AuthenticationError, AuthorizationError } from "./errors";
import { Role } from "@workspace/shared-validators";

export function extractTokenFromHeader(request: NextRequest): string {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Token no proporcionado");
  }
  return authHeader.slice(7);
}

export function authenticate(request: NextRequest): TokenPayload {
  const token = extractTokenFromHeader(request);
  return verifyAccessToken(token);
}

export function requireRole(allowedRoles: Role[]) {
  return (request: NextRequest) => {
    const user = authenticate(request);
    if (!allowedRoles.includes(user.role)) {
      throw new AuthorizationError("No tienes permisos para acceder a este recurso");
    }
    return user;
  };
}
