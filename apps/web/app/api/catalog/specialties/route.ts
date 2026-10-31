import { NextRequest } from "next/server"
import { Role } from "@biodentis/shared-types"
import { requireRole } from "@/lib/middleware"
import { handleApiError } from "@/lib/errors"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

const service = new CatalogAdminService()

/** POST /api/catalog/specialties — gestión del catálogo, solo ADMIN. */
export async function POST(request: NextRequest) {
  try {
    const { sub: actorId } = await requireRole(request, [Role.ADMIN])
    return Response.json(
      await service.saveSpecialty(await request.json(), actorId),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
