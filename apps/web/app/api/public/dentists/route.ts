import { DentistService } from "@/modules/dentists/dentist.service";
import { handleApiError } from "@/lib/errors";

const dentistService = new DentistService();

export async function GET() {
  try {
    return Response.json(await dentistService.getPublicProfiles(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
