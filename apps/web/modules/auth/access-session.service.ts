import { Role } from "@biodentis/shared-types";
import { verifyAccessToken } from "@/lib/auth";
import { AuthenticationError } from "@/lib/errors";
import { AccessSessionRepository } from "./access-session.repository";

export class AccessSessionService {
  constructor(private readonly repository = new AccessSessionRepository()) {}

  /** Consulta el estado actual en cada petición; no almacena autorizaciones en caché. */
  async authenticate(token: string) {
    const payload = verifyAccessToken(token);
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || !payload.sid) {
      // Los JWT anteriores se renuevan con la cookie, nunca se aceptan sin sesión.
      throw new AuthenticationError("Es necesario renovar la sesión");
    }
    const session = await this.repository.findByJti(payload.sid);
    if (
      !session || session.userId !== payload.sub || session.revokedAt ||
      session.expiresAt <= new Date() || !session.user.isActive
    ) {
      throw new AuthenticationError("La cuenta o la sesión ya no está activa");
    }
    return { ...payload, role: session.user.role as Role };
  }
}
