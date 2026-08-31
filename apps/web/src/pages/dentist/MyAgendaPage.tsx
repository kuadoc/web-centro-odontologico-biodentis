import { useState, useEffect } from "react";
import { appointmentsApi, Appointment } from "../../api/appointments";
import { formatDate } from "../../lib/utils";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export function MyAgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAppointments = () => {
    setIsLoading(true);
    appointmentsApi.getAll().then(setAppointments).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleMarkStatus = async (id: string, status: "COMPLETED" | "NO_SHOW") => {
    try {
      await appointmentsApi.updateStatus(id, status);
      loadAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Error al actualizar");
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Mi Agenda</h1>

      {appointments.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No tienes citas programadas.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{apt.patient.email}</p>
                  <p className="text-sm">
                    {formatDate(apt.date)} - {apt.startTime} a {apt.endTime}
                  </p>
                  {apt.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">Nota: {apt.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[apt.status]}`}>
                    {apt.status}
                  </span>
                  {apt.status === "CONFIRMED" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMarkStatus(apt.id, "COMPLETED")}
                        className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                      >
                        Completada
                      </button>
                      <button
                        onClick={() => handleMarkStatus(apt.id, "NO_SHOW")}
                        className="rounded-md bg-orange-600 px-3 py-1 text-xs text-white hover:bg-orange-700"
                      >
                        No Asistio
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
