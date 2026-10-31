import { ServiceCatalogService } from "@/modules/service-catalog/service-catalog.service";
import { handleApiError } from "@/lib/errors";

const serviceCatalog = new ServiceCatalogService();

/** GET /api/public/services — servicios activos y precios públicos, sin sesión. */
export async function GET() {
  try {
    return Response.json(await serviceCatalog.getPublicCatalog(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
