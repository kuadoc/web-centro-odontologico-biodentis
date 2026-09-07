import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { handleApiError, AuthenticationError } from "@/lib/errors";
import { setRefreshTokenCookie, getRefreshTokenFromCookie } from "@/lib/auth";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromCookie(request);

    if (!refreshToken) {
      throw new AuthenticationError("Refresh token no proporcionado");
    }

    const result = await authService.refresh(refreshToken);

    const response = NextResponse.json({
      accessToken: result.accessToken,
    });

    return setRefreshTokenCookie(response, result.refreshToken);
  } catch (error) {
    return handleApiError(error);
  }
}
