import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { handleApiError } from "@/lib/errors";
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let email = "unknown";

  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.toLowerCase() : "unknown";

    if (loginLimiterByIp.isBlocked(`ip:${ip}`)) {
      return NextResponse.json(
        { error: "Demasiados intentos desde esta IP. Intente más tarde." },
        { status: 429 }
      );
    }

    if (email !== "unknown" && loginLimiterByEmail.isBlocked(`email:${email}`)) {
      return NextResponse.json(
        { error: "Demasiados intentos para este email. Intente más tarde." },
        { status: 429 }
      );
    }

    if (email !== "unknown") {
      const { locked, remainingMs } = isAccountLocked(email);
      if (locked) {
        const minutes = Math.ceil(remainingMs / 60000);
        return NextResponse.json(
          { error: `Cuenta bloqueada temporalmente. Intente en ${minutes} minuto(s).` },
          { status: 423 }
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
    if (email !== "unknown") {
      loginLimiterByIp.increment(`ip:${ip}`);
      loginLimiterByEmail.increment(`email:${email}`);
      const accountLocked = recordFailedAttempt(email, ip, "invalid_credentials");
      console.warn(
        `[LOGIN_FAIL] ip=${ip} email=${email} accountLocked=${accountLocked}`
      );
    }

    return handleApiError(error);
  }
}
