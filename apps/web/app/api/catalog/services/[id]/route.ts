import { NextRequest } from "next/server"
import { Role } from "@biodentis/shared-types"
import { requireRole } from "@/lib/middleware"
import { handleApiError } from "@/lib/errors"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

const service = new CatalogAdminService()

/** PATCH /api/catalog/services/[id] — gestión del catálogo, solo ADMIN. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { sub: actorId } = await requireRole(request, [Role.ADMIN])
    const { id } = await params
    const body = await request.json()
    return Response.json(
      await service.saveService(body.specialtyId, body, actorId, id)
    )
  } catch (error) {
    return handleApiError(error)
  }
}
