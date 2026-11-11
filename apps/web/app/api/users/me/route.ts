import { NextRequest } from "next/server";
import { UserService } from "@/modules/users/user.service";
import { ProfileService } from "@/modules/profile/profile.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const userService = new UserService();
const profileService = new ProfileService();

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const profile = await userService.getProfile(user.sub);
    return Response.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Delega en ProfileService para compartir validacion con /api/profile. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const body = await request.json();
    const updated = await profileService.updateMyProfile(user.sub, body);
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
