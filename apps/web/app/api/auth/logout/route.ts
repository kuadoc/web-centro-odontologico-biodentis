import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { handleApiError } from "@/lib/errors";
import { getRefreshTokenFromCookie, clearRefreshTokenCookie } from "@/lib/auth";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromCookie(request);

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    const response = NextResponse.json({ message: "Sesión cerrada" });
    return clearRefreshTokenCookie(response);
  } catch (error) {
    return handleApiError(error);
  }
}
