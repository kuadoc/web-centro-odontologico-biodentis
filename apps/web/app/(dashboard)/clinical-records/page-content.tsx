"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Pagination } from "@workspace/ui/components/pagination";
import { usePagination } from "@workspace/ui/hooks/use-pagination";
import { useAppointments } from "@/hooks/use-queries";
import { FileText, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PatientClinicalHistory } from "@/components/clinical-records/patient-clinical-history";
import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils";

export default function ClinicalRecordsPage() {
  const { user } = useAuth();

  return user?.role === "PATIENT" ? <PatientClinicalHistory /> : <StaffClinicalRecords />;
}

function StaffClinicalRecords() {
  const { data: appointmentsData, isLoading } = useAppointments();

  const records = useMemo(() => {
    const appts = Array.isArray(appointmentsData) ? appointmentsData : [];
    return appts
      .flatMap((appointment) => appointment.clinicalRecord ? [{
        id: appointment.id,
        notes: appointment.clinicalRecord.notes,
        patient: appointment.patient,
        dentist: appointment.dentist,
        appointment,
      }] : []);
  }, [appointmentsData]);

  const pagination = usePagination(records, 10);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando historial clínico...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Historial Clínico</h2>
        <p className="text-muted-foreground">Registros clínicos de pacientes</p>
      </div>

      <div className="space-y-4">
        {records.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-sm">No hay registros clínicos</p>
            </CardContent>
          </Card>
        ) : (
          pagination.pageItems.map((record) => (
            <Card key={record.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {record.patient ? `${record.patient.firstName} ${record.patient.lastName}` : "Paciente no disponible"}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatCalendarDate(record.appointment.date)} · {formatTime(record.appointment.startTime)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    {record.appointment.treatment && <p className="mb-2 text-sm font-medium">{record.appointment.treatment.specialty?.name ?? record.appointment.treatment.category} · {record.appointment.treatment.name}</p>}
                    <p className="text-sm">{record.notes}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {record.dentist?.user ? `Dr. ${record.dentist.user.firstName} ${record.dentist.user.lastName}` : "Odontólogo no disponible"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {records.length > 0 && (
        <Card className="overflow-hidden">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            label="registros"
          />
        </Card>
      )}
    </div>
  );
}
