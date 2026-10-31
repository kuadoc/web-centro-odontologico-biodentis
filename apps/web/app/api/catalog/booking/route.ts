import { NextRequest } from "next/server"
import { Role } from "@biodentis/shared-types"
import { requireRole } from "@/lib/middleware"
import { handleApiError } from "@/lib/errors"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

const service = new CatalogAdminService()

/** GET /api/catalog/booking — catálogo disponible para agendar. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [
      Role.ADMIN,
      Role.RECEPTIONIST,
      Role.PATIENT,
      Role.DENTIST,
    ])
    return Response.json(await service.bookingCatalog())
  } catch (error) {
    return handleApiError(error)
  }
}
