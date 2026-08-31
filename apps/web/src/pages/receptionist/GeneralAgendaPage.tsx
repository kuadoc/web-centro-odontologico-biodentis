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

export function GeneralAgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAppointments = () => {
    setIsLoading(true);
    appointmentsApi.getAll().then(setAppointments).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      await appointmentsApi.confirm(id);
      loadAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Error al confirmar");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Rechazar esta cita?")) return;
    try {
      await appointmentsApi.reject(id);
      loadAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Error al rechazar");
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Agenda General</h1>

      {appointments.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No hay citas registradas.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {apt.dentist.user.firstName} {apt.dentist.user.lastName} - {apt.dentist.specialty}
                  </p>
                  <p className="text-sm">
                    {formatDate(apt.date)} - {apt.startTime} a {apt.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[apt.status]}`}>
                    {apt.status}
                  </span>
                  {apt.status === "PENDING" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleConfirm(apt.id)}
                        className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => handleReject(apt.id)}
                        className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Rechazar
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
