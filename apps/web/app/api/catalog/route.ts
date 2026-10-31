import { NextRequest } from "next/server"
import { Role } from "@biodentis/shared-types"
import { requireRole } from "@/lib/middleware"
import { handleApiError } from "@/lib/errors"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

const service = new CatalogAdminService()

/** GET /api/catalog — gestión del catálogo, solo ADMIN. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN])
    return Response.json(await service.list())
  } catch (error) {
    return handleApiError(error)
  }
}
