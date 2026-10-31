import { NextRequest } from "next/server"
import { Role } from "@biodentis/shared-types"
import { requireRole } from "@/lib/middleware"
import { handleApiError } from "@/lib/errors"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

const service = new CatalogAdminService()

/** PUT /api/catalog/specialties/[id]/dentists — gestión del catálogo, solo ADMIN. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { sub: actorId } = await requireRole(request, [Role.ADMIN])
    const { id } = await params
    return Response.json(
      await service.assign(id, await request.json(), actorId)
    )
  } catch (error) {
    return handleApiError(error)
  }
}
