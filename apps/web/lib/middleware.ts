import { NextRequest } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "./auth";
import { AuthenticationError, AuthorizationError } from "./errors";
import { Role } from "@biodentis/shared-types";
import { prisma } from "./prisma";

export function extractTokenFromHeader(request: NextRequest): string {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Token no proporcionado");
  }
  return authHeader.slice(7);
}

export function authenticate(request: NextRequest): AccessTokenPayload {
  const token = extractTokenFromHeader(request);
  return verifyAccessToken(token);
}

export async function requireRole(request: NextRequest, allowedRoles: Role[]): Promise<AccessTokenPayload & { role: Role }> {
  const payload = authenticate(request);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AuthenticationError("Usuario no encontrado");
  }
  if (!allowedRoles.includes(user.role as Role)) {
    throw new AuthorizationError("No tienes permisos para acceder a este recurso");
  }
  return { ...payload, role: user.role as Role };
}
