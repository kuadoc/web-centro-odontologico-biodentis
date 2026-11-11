import { NextRequest } from "next/server";
import { AuthenticationError, AuthorizationError } from "./errors";
import { Role } from "@biodentis/shared-types";
import { AccessSessionService } from "@/modules/auth/access-session.service";

const sessions = new AccessSessionService();

export function extractTokenFromHeader(request: NextRequest): string {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Token no proporcionado");
  }
  return authHeader.slice(7);
}

export async function authenticate(request: NextRequest) {
  const token = extractTokenFromHeader(request);
  return sessions.authenticate(token);
}

export async function requireRole(request: NextRequest, allowedRoles: Role[]) {
  const payload = await authenticate(request);
  if (!allowedRoles.includes(payload.role)) {
    throw new AuthorizationError("No tienes permisos para acceder a este recurso");
  }
  return payload;
}
