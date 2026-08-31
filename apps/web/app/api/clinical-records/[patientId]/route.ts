import { NextRequest } from "next/server";
import { ClinicalRecordService } from "@/modules/clinical-records/clinical-record.service";
import { AccessControlService } from "@/modules/access-control/access-control.service";
import { authenticate } from "@/lib/middleware";
import { Role } from "@workspace/shared-validators";
import { handleApiError } from "@/lib/errors";

const clinicalRecordService = new ClinicalRecordService();
const accessControl = new AccessControlService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const user = authenticate(request);
    const { patientId } = await params;

    accessControl.canViewClinicalRecord(user.role as Role, user.userId, patientId);

    const records = await clinicalRecordService.getByPatient(patientId);
    return Response.json(records);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request);
    accessControl.canCreateClinicalRecord(user.role as Role);

    const body = await request.json();
    const record = await clinicalRecordService.create(body, user.userId);
    return Response.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
