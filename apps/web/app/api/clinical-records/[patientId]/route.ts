import { NextRequest } from "next/server";
import { ClinicalRecordService } from "@/modules/clinical-records/clinical-record.service";
import { AccessControlService } from "@/modules/access-control/access-control.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const clinicalRecordService = new ClinicalRecordService();
const accessControl = new AccessControlService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const user = await requireRole(request, [Role.PATIENT, Role.DENTIST, Role.ADMIN]);
    const { patientId } = await params;

    // Verificacion contra DB: paciente solo ve su historial, dentista solo ve SUS pacientes, admin ve todo
    await accessControl.canViewClinicalRecord(user.role, user.sub, patientId);

    const records = await clinicalRecordService.getByPatient(patientId);
    return Response.json(records);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, [Role.DENTIST, Role.ADMIN]);
    accessControl.canCreateClinicalRecord(user.role);

    const body = await request.json();
    const record = await clinicalRecordService.create(body, user.sub);
    return Response.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
