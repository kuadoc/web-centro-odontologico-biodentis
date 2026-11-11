import { NextRequest } from "next/server";
import { DentistService } from "@/modules/dentists/dentist.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const dentistService = new DentistService();

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const dentist = await dentistService.getByUserId(user.sub);
    if (!dentist) return Response.json(null);
    return Response.json(dentist);
  } catch (error) {
    return handleApiError(error);
  }
}
