import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { handleApiError } from "@/lib/errors";
import { setRefreshTokenCookie } from "@/lib/auth";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.register(body);

    const response = NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
    }, { status: 201 });

    return setRefreshTokenCookie(response, result.refreshToken);
  } catch (error) {
    return handleApiError(error);
  }
}
