import { NextRequest } from "next/server";
import { ProfileService } from "@/modules/profile/profile.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const profileService = new ProfileService();

/** PATCH /api/profile/password — cambia la contraseña y revoca las demás sesiones. */
export async function PATCH(request: NextRequest) {
  try {
    const user = authenticate(request);
    const body = await request.json();
    const result = await profileService.changePassword(user.sub, body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
