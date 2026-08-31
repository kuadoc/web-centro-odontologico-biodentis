import { useState, useEffect } from "react";
import { clinicalRecordsApi, ClinicalRecord } from "../../api/clinical-records";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../lib/utils";

export function MyClinicalHistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      clinicalRecordsApi
        .getByPatientId(user.id)
        .then(setRecords)
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Mi Historial Clinico</h1>
      <p className="text-muted-foreground">Solo lectura - consultas anteriores.</p>

      {records.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No hay registros clinicos aun.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    Dr. {record.dentist.user.firstName} {record.dentist.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{record.dentist.specialty}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(record.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm">{record.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
