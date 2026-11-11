import jwt from "jsonwebtoken";
import { Role } from "@biodentis/shared-types";
import { hashToken, verifyRefreshToken } from "@/lib/auth";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { canAccessRoute } from "@/lib/route-access";
import { PageSessionRepository } from "./page-session.repository";

export class PageSessionService {
  constructor(private readonly repository = new PageSessionRepository()) {}

  /** Valida la sesión sin rotar tokens; el rol siempre se consulta en la BD. */
  async authorize(token: string | undefined, pathname: string) {
    if (!token) throw new AuthenticationError();
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) throw new AuthenticationError();
      throw error;
    }

    const session = await this.repository.findByTokenHash(hashToken(token));
    if (
      !session || session.revokedAt || session.expiresAt <= new Date() ||
      session.userId !== payload.sub || session.jti !== payload.jti ||
      !session.user.isActive
    ) {
      throw new AuthenticationError();
    }

    const role = session.user.role as Role;
    if (!canAccessRoute(role, pathname)) throw new AuthorizationError();
    return { id: session.user.id, role };
  }
}
