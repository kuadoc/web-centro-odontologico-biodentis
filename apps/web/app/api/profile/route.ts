import { NextRequest } from "next/server";
import { ProfileService } from "@/modules/profile/profile.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const profileService = new ProfileService();

/** GET /api/profile — perfil completo del usuario autenticado. */
export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);
    const profile = await profileService.getMyProfile(user.sub);
    return Response.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/profile — actualiza los datos de contacto propios. */
export async function PATCH(request: NextRequest) {
  try {
    const user = authenticate(request);
    const body = await request.json();
    const updated = await profileService.updateMyProfile(user.sub, body);
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
