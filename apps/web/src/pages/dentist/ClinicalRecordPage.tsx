import { useState, useEffect } from "react";
import { clinicalRecordsApi, ClinicalRecord } from "../../api/clinical-records";
import { appointmentsApi, Appointment } from "../../api/appointments";
import { formatDateTime } from "../../lib/utils";

export function ClinicalRecordPage() {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState("");
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      appointmentsApi.getAll().then((apts) => {
        const completed = apts.filter((a) => a.status === "COMPLETED");
        setCompletedAppointments(completed);
        if (completed.length > 0) {
          setPatientId(completed[0].patientId);
        }
      }),
    ]).finally(() => setIsLoading(false));
  }, []);

  const loadRecords = async () => {
    if (!patientId) return;
    const records = await clinicalRecordsApi.getByPatientId(patientId);
    setRecords(records);
  };

  useEffect(() => {
    if (patientId) {
      loadRecords();
    }
  }, [patientId]);

  const handleSubmit = async () => {
    if (!selectedAppointment || !patientId || !notes) return;

    setMessage("");
    try {
      await clinicalRecordsApi.create({
        patientId,
        appointmentId: selectedAppointment,
        notes,
      });
      setMessage("Historial clinico registrado exitosamente.");
      setNotes("");
      loadRecords();
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "Error al registrar");
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Historial Clinico</h1>

      {message && (
        <div className="mt-4 rounded-md bg-primary/10 p-3 text-sm text-primary">
          {message}
        </div>
      )}

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="font-medium">Registrar nueva nota</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-sm font-medium">Paciente</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {completedAppointments.length > 0 ? (
                [...new Set(completedAppointments.map((a) => a.patientId))].map((pid) => {
                  const apt = completedAppointments.find((a) => a.patientId === pid);
                  return (
                    <option key={pid} value={pid}>
                      {apt?.patient.firstName} {apt?.patient.lastName}
                    </option>
                  );
                })
              ) : (
                <option value="">No hay pacientes con citas completadas</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Cita completada</label>
            <select
              value={selectedAppointment}
              onChange={(e) => setSelectedAppointment(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {completedAppointments
                .filter((a) => a.patientId === patientId)
                .map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {new Date(apt.date).toLocaleDateString()} {apt.startTime}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Notas clinicas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={4}
              placeholder="Descripcion de la consulta, diagnostico, tratamiento..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedAppointment || !patientId || !notes}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Registrar Historial
          </button>
        </div>
      </div>

      {records.length > 0 && (
        <div className="mt-6">
          <h2 className="font-medium">Registros anteriores</h2>
          <div className="mt-3 space-y-3">
            {records.map((record) => (
              <div key={record.id} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{formatDateTime(record.createdAt)}</p>
                <p className="mt-1 text-sm">{record.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
