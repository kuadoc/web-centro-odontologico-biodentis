import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthenticationError, handleApiError } from "@/lib/errors";
import { setRefreshTokenCookie } from "@/lib/auth";
import { LoginThrottleService } from "@/modules/auth/login-throttle.service";

const throttle = new LoginThrottleService();
const authService = new AuthService();

function getClientIp(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || null;
}

/** POST /api/auth/login — inicio de sesión público con límites por IP y correo. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let email = "unknown";

  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "unknown";
    const volume = await throttle.admit(email, ip);
    if (volume.blocked) return NextResponse.json(
      { error: "Se recibieron demasiadas solicitudes de acceso. Espera un minuto y vuelve a intentar." },
      { status: 429, headers: { "Retry-After": String(volume.retryAfter) } },
    );

    const result = await authService.login(body);

    // La contraseña correcta permite recuperarse de fallos anteriores. Ninguna
    // cuenta hereda el bloqueo de otra persona conectada a la misma red.
    await throttle.clear(email, ip);

    const response = NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
    });

    return setRefreshTokenCookie(response, result.refreshToken);
  } catch (error) {
    if (error instanceof AuthenticationError && email !== "unknown") {
      try {
        const limit = await throttle.failed(email, ip);
        if (limit.blocked) return NextResponse.json(
          { error: "Demasiados intentos con credenciales incorrectas. Verifica tus datos o recupera tu contraseña." },
          { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
        );
      } catch (storageError) { return handleApiError(storageError); }
    }

    return handleApiError(error);
  }
}
