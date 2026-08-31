"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAuthContext } from "@/contexts/auth-context";
import { FileText, Calendar } from "lucide-react";

interface ClinicalRecord {
  id: string;
  notes: string;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string };
  dentist: { user: { firstName: string; lastName: string } };
  appointment: { date: string; startTime: string; endTime: string };
}

export default function ClinicalRecordsPage() {
  const { api, user } = useAuthContext();
  const [records, setRecords] = useState<ClinicalRecord[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const appts = await api.get<Array<{
          id: string;
          patient?: { id: string; firstName: string; lastName: string };
          clinicalRecord?: ClinicalRecord;
        }>>("/api/appointments");

        if (Array.isArray(appts)) {
          const recordsWithNotes = appts
            .filter((a) => a.clinicalRecord)
            .map((a) => a.clinicalRecord as ClinicalRecord);
          setRecords(recordsWithNotes);
        }
      } catch {
        console.error("Error loading clinical records");
      }
    }
    load();
  }, [api]);

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
          records.map((record) => (
            <Card key={record.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {record.patient.firstName} {record.patient.lastName}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {record.appointment.date}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{record.notes}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dr. {record.dentist.user.firstName} {record.dentist.user.lastName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
