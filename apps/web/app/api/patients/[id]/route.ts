import { NextRequest } from "next/server";
import { PatientService } from "@/modules/patients/patient.service";
import { resolvePatientScope, requirePatientAdmin } from "@/modules/patients/patient.scope";
import { handleApiError } from "@/lib/errors";

const patientService = new PatientService();

/**
 * GET /api/patients/[id] — ficha administrativa: contacto, metricas de
 * actividad e historial de agenda. Un DENTIST solo ve pacientes que atendio,
 * y de ellos solo sus propias citas.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await resolvePatientScope(request);
    const { id } = await params;
    const detail = await patientService.getDetail(id, scope);
    return Response.json(detail);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/patients/[id] — edicion con motivo de auditoria obligatorio. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actorId } = await requirePatientAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const updated = await patientService.update(id, body, actorId);
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/patients/[id] — desactivacion (baja logica, nunca borrado). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actorId } = await requirePatientAdmin(request);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const updated = await patientService.setActive(
      id,
      false,
      body.reason ?? "Cuenta desactivada por administración",
      actorId
    );
    return Response.json({ success: true, patient: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
