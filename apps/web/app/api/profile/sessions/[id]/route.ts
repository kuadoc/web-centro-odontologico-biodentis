import { NextRequest } from "next/server";
import { ProfileService } from "@/modules/profile/profile.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const profileService = new ProfileService();

/** DELETE /api/profile/sessions/[id] — cierra una sesión concreta del propio usuario. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(request);
    const { id } = await params;
    const result = await profileService.revokeSession(user.sub, id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
