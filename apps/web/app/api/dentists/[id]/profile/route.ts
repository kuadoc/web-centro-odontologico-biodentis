import { NextRequest } from "next/server";
import { ProfileService } from "@/modules/profile/profile.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

const profileService = new ProfileService();

/**
 * PATCH /api/dentists/[id]/profile — datos profesionales (especialidad, colegiatura,
 * alma máter, turno, box asignado). Solo Dirección Médica (ADMIN).
 * [id] es el userId del odontólogo.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const updated = await profileService.updateDentistProfile(id, body);
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
