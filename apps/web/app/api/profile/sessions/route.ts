import { NextRequest } from "next/server";
import { ProfileService } from "@/modules/profile/profile.service";
import { authenticate } from "@/lib/middleware";
import { getRefreshTokenFromCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

const profileService = new ProfileService();

/** GET /api/profile/sessions — sesiones activas del usuario. */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const sessions = await profileService.getMySessions(user.sub, getRefreshTokenFromCookie(request));
    return Response.json(sessions);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/profile/sessions — cierra todas las sesiones salvo la actual. */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const result = await profileService.revokeOtherSessions(user.sub, getRefreshTokenFromCookie(request));
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
