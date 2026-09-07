import { NextRequest } from "next/server";
import { DentistService } from "@/modules/dentists/dentist.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const dentistService = new DentistService();

export async function GET(request: NextRequest) {
  try {
    authenticate(request);
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty");

    const dentists = specialty
      ? await dentistService.getBySpecialty(specialty)
      : await dentistService.getAll();

    return Response.json(dentists);
  } catch (error) {
    return handleApiError(error);
  }
}
