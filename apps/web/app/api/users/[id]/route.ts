import { NextRequest } from "next/server";
import { UserService } from "@/modules/users/user.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

const userService = new UserService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const user = await userService.update(id, body, actor.sub);
    return Response.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    await userService.update(id, { isActive: false }, actor.sub);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
