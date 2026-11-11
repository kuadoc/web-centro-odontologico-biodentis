import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthenticationError, handleApiError } from "@/lib/errors";
import { setRefreshTokenCookie } from "@/lib/auth";
import { RateLimiter } from "@/lib/rate-limit";
import { isAccountLocked, recordFailedAttempt, clearFailedAttempts } from "@/lib/login-attempts";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const loginLimiterByIp = new RateLimiter(5, FIFTEEN_MINUTES_MS);
const loginLimiterByEmail = new RateLimiter(5, FIFTEEN_MINUTES_MS);
const authService = new AuthService();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

/** POST /api/auth/login — inicio de sesión público con límites por IP y correo. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let email = "unknown";

  try {
    if (loginLimiterByIp.isBlocked(`ip:${ip}`)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intente más tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.toLowerCase() : "unknown";

    if (email !== "unknown") {
      const { locked, remainingMs } = isAccountLocked(email);
      if (locked) {
        const minutes = Math.ceil(remainingMs / 60000);
        return NextResponse.json(
          { error: `Cuenta bloqueada temporalmente. Intente en ${minutes} minuto(s).` },
          { status: 423, headers: { "Retry-After": String(Math.ceil(remainingMs / 1000)) } }
        );
      }
      if (loginLimiterByEmail.isBlocked(`email:${email}`)) {
        return NextResponse.json(
          { error: "Demasiados intentos para este email. Intente más tarde." },
          { status: 429 }
        );
      }
    }

    const result = await authService.login(body);

    loginLimiterByIp.reset(`ip:${ip}`);
    if (email !== "unknown") {
      loginLimiterByEmail.reset(`email:${email}`);
      clearFailedAttempts(email);
    }

    const response = NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
    });

    return setRefreshTokenCookie(response, result.refreshToken);
  } catch (error) {
    if (error instanceof AuthenticationError && email !== "unknown") {
      loginLimiterByIp.increment(`ip:${ip}`);
      loginLimiterByEmail.increment(`email:${email}`);
      recordFailedAttempt(email, ip, "invalid_credentials");
    }

    return handleApiError(error);
  }
}
