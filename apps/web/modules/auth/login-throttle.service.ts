import { createHash } from "node:crypto";
import { LoginThrottleRepository } from "./login-throttle.repository";

const WINDOW_MS = 15 * 60_000;
export class LoginThrottleService {
  constructor(private readonly repository = new LoginThrottleRepository()) {}
  private key(scope: string, value: string) { return `${scope}:${createHash("sha256").update(value).digest("hex")}`; }
  async admit(email: string, ip: string | null) {
    // Protección de volumen separada de los errores de contraseña. Sin IP no
    // creamos un contador global compartido por todos los visitantes.
    const result = await this.repository.increment(this.key("login-volume", ip ?? email), 60_000);
    return { blocked: result.count > 100, retryAfter: Math.max(1, Math.ceil((result.expiresAt.getTime() - Date.now()) / 1000)) };
  }
  async allowPasswordReset(email: string) {
    const result = await this.repository.increment(this.key("password-reset", email), WINDOW_MS);
    return result.count <= 3;
  }
  async failed(email: string, ip: string | null) {
    const result = await this.repository.increment(this.key("login-failure", `${email.trim().toLowerCase()}\n${ip ?? "no-ip"}`), WINDOW_MS);
    return { blocked: result.count >= 5, retryAfter: Math.max(1, Math.ceil((result.expiresAt.getTime() - Date.now()) / 1000)) };
  }
  clear(email: string, ip: string | null) { return this.repository.clear(this.key("login-failure", `${email.trim().toLowerCase()}\n${ip ?? "no-ip"}`)); }
}
