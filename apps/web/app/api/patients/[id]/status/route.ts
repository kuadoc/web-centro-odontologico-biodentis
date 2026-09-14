import { NextRequest } from "next/server";
import { PatientService } from "@/modules/patients/patient.service";
import { requirePatientAdmin } from "@/modules/patients/patient.scope";
import { handleApiError } from "@/lib/errors";

const patientService = new PatientService();

/** PATCH /api/patients/[id]/status — activa o desactiva la cuenta del paciente. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actorId } = await requirePatientAdmin(request);
    const { id } = await params;
    const body = (await request.json()) as { isActive?: boolean; reason?: string };

    if (typeof body.isActive !== "boolean") {
      return Response.json({ error: "isActive es requerido" }, { status: 400 });
    }

    const updated = await patientService.setActive(
      id,
      body.isActive,
      body.reason ?? (body.isActive ? "Reactivación de cuenta" : "Desactivación de cuenta"),
      actorId
    );
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
